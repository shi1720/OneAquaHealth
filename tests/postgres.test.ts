import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PostgresStorage, postgresStatement } from '../server/postgres';

describe('audited PostgreSQL statement adaptation', () => {
  it('ports only unquoted bind markers and the exact changes() function', () => {
    expect(
      postgresStatement(
        `SELECT ?, '? changes() $1', 'it''s ?', "?column", changes() -- ? changes()\n/* ? changes() */ WHERE id=?`,
        2,
      ),
    ).toBe(
      `SELECT $1, '? changes() $1', 'it''s ?', "?column", rill_changes() -- ? changes()\n/* ? changes() */ WHERE id=$2`,
    );
  });
  it('rejects mismatched binds and unsupported or unfinished SQL syntax', () => {
    expect(() => postgresStatement('SELECT ?', 0)).toThrow('parameter count');
    expect(() => postgresStatement("SELECT 'unfinished", 0)).toThrow('Unterminated');
    expect(() => postgresStatement('SELECT /* unfinished', 0)).toThrow('Unterminated');
    expect(() => postgresStatement('SELECT $1', 1)).toThrow('Unsupported');
    expect(() => postgresStatement('SELECT 1; SELECT 2', 0)).toThrow('one statement');
  });
});

describe.skipIf(!process.env.RILL_TEST_POSTGRES_URL)('PostgreSQL transactional invariants', () => {
  let db: PostgresStorage, admin: Pool, schema: string;
  const time = '2026-09-23T10:00:00.000Z';
  beforeEach(async () => {
    schema = `rill_test_${crypto.randomUUID().replaceAll('-', '')}`;
    admin = new Pool({ connectionString: process.env.RILL_TEST_POSTGRES_URL });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = await PostgresStorage.connect(process.env.RILL_TEST_POSTGRES_URL, { schema });
    await db.run('INSERT INTO workspaces(id,name,is_demo,created_at) VALUES(?,?,?,?)', [
      'workspace',
      'Synthetic SQL QA',
      1,
      time,
    ]);
  });
  afterEach(async () => {
    await db?.close();
    if (schema) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin?.end();
  });
  it('preserves changes-based conditional audits and rolls earlier statements back on a late failure', async () => {
    const success = await db.batch([
      {
        sql: 'INSERT INTO sites(id,workspace_id,payload) VALUES(?,?,?)',
        params: ['site', 'workspace', '{"name":"Original"}'],
      },
      {
        sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) SELECT ?,?,?,? WHERE changes()=1',
        params: ['created', 'workspace', '{}', time],
      },
    ]);
    expect(success.map((item) => item.changes)).toEqual([1, 1]);
    const conflict = await db.batch([
      {
        sql: 'UPDATE sites SET payload=? WHERE workspace_id=? AND id=?',
        params: ['{}', 'workspace', 'missing'],
      },
      {
        sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) SELECT ?,?,?,? WHERE changes()=1',
        params: ['phantom', 'workspace', '{}', time],
      },
    ]);
    expect(conflict.map((item) => item.changes)).toEqual([0, 0]);
    await expect(
      db.batch([
        {
          sql: 'UPDATE sites SET payload=? WHERE workspace_id=? AND id=?',
          params: ['{"name":"Must rollback"}', 'workspace', 'site'],
        },
        {
          sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) VALUES(?,?,?,?)',
          params: ['created', 'workspace', '{}', time],
        },
      ]),
    ).rejects.toThrow('UNIQUE');
    expect(
      (
        await db.get<{ payload: string }>(
          'SELECT payload FROM sites WHERE workspace_id=? AND id=?',
          ['workspace', 'site'],
        )
      )?.payload,
    ).toBe('{"name":"Original"}');
    expect((await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM audits'))?.count).toBe(
      1,
    );
  });
  it('prevents concurrent writers from exceeding a quota and leaves no audit for the rejected write', async () => {
    await db.batch(
      Array.from({ length: 99 }, (_, index) => ({
        sql: 'INSERT INTO sites(id,workspace_id,payload) VALUES(?,?,?)',
        params: [`existing-${index}`, 'workspace', '{}'],
      })),
    );
    const results = await Promise.allSettled(
      ['a', 'b'].map((id) =>
        db.batch([
          {
            sql: 'INSERT INTO sites(id,workspace_id,payload) VALUES(?,?,?)',
            params: [id, 'workspace', '{}'],
          },
          {
            sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) SELECT ?,?,?,? WHERE changes()=1',
            params: [id, 'workspace', '{}', time],
          },
        ]),
      ),
    );
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((item) => item.status === 'rejected') as PromiseRejectedResult;
    expect(String(rejected.reason)).toContain('rill_quota_exceeded');
    expect((await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM sites'))?.count).toBe(
      100,
    );
    expect((await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM audits'))?.count).toBe(
      1,
    );
  });
  it('retries serialization conflicts without losing increments or crossing transaction state', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        db.run(
          'INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1',
          ['same-key', 0],
        ),
      ),
    );
    const succeeded = attempts.filter((result) => result.status === 'fulfilled').length;
    expect(succeeded).toBeGreaterThan(0);
    expect(
      (await db.get<{ hits: number }>('SELECT hits FROM rate_limits WHERE key=?', ['same-key']))
        ?.hits,
    ).toBe(succeeded);
    // Retries are intentionally bounded. Under contention a client can receive
    // a retryable conflict; aborted attempts must not apply an increment.
    for (const result of attempts) {
      if (result.status === 'fulfilled') continue;
      expect(String(result.reason)).toContain('rill_serialization_conflict');
      await db.run(
        'INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1',
        ['same-key', 0],
      );
    }
    expect(
      (await db.get<{ hits: number }>('SELECT hits FROM rate_limits WHERE key=?', ['same-key']))
        ?.hits,
    ).toBe(8);
    const fresh = await db.batch([
      {
        sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) SELECT ?,?,?,? WHERE changes()=1',
        params: ['should-not-exist', 'workspace', '{}', time],
      },
    ]);
    expect(fresh[0].changes).toBe(0);
  });
  it('initializes its schema idempotently and preserves scalar JSON/null behavior', async () => {
    const second = await PostgresStorage.connect(process.env.RILL_TEST_POSTGRES_URL, { schema });
    try {
      expect(
        await second.get('SELECT json_extract(?,?) AS value', [
          '{"lastCheckedAt":null}',
          '$.lastCheckedAt',
        ]),
      ).toEqual({ value: null });
      const value = await second.get<{ payload: string }>('SELECT json_set(?,?,?) AS payload', [
        '{"lastCheckedAt":null}',
        '$.lastCheckedAt',
        time,
      ]);
      expect(JSON.parse(value!.payload)).toEqual({ lastCheckedAt: time });
      expect(
        (await second.get<{ count: number }>('SELECT COUNT(*) AS count FROM rill_migrations'))
          ?.count,
      ).toBe(1);
    } finally {
      await second.close();
    }
  });
});
