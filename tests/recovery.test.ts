import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app';
import { SQLiteStorage } from '../server/sqlite';
import { LibSQLStorage } from '../server/libsql';
import { newRecoveryKey, recoveryKeyHash } from '../server/security';
import type { RecoveryAuthResult } from '../shared/types';
const origin = 'http://recovery.test',
  password = 'A long initial passphrase 2026!',
  nextPassword = 'A different recovered passphrase 2026!';
const cookie = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];

describe.each(['sqlite', 'libsql'] as const)('%s offline recovery', (storageKind) => {
  let db: SQLiteStorage | LibSQLStorage, app: ReturnType<typeof createApp>, directory: string;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'rill-recovery-'));
    db =
      storageKind === 'sqlite'
        ? new SQLiteStorage(join(directory, 'db.sqlite'))
        : await LibSQLStorage.connect(`file:${join(directory, 'db.sqlite')}`);
    app = createApp(db, { origin, passwordIterations: 100_000 });
  });
  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
  function request(path: string, data?: unknown, session?: string) {
    return app.request(origin + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        ...(session ? { cookie: session } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }
  async function register() {
    const response = await request('/api/auth/register', {
      name: 'Recovery QA',
      email: 'recovery@example.test',
      password,
      workspaceName: 'Disposable recovery QA',
    });
    expect(response.status).toBe(201);
    return { ...((await response.json()) as RecoveryAuthResult), session: cookie(response) };
  }
  const reset = (email: string, recoveryKey: string, newPassword = nextPassword) =>
    request('/api/auth/recover', { email, recoveryKey, newPassword });
  it('issues a 256-bit secret once and keeps only its hash outside the issuance response', async () => {
    const account = await register();
    expect(/^RILL-(?:[0-9A-F]{8}-){7}[0-9A-F]{8}$/.test(account.recoveryKey)).toBe(true);
    const stored = await db.get<{ key_hash: string }>(
      'SELECT key_hash FROM recovery_keys WHERE user_id=?',
      [account.user.id],
    );
    // A regression storing the secret must fail without printing it in diagnostics.
    expect(stored?.key_hash === (await recoveryKeyHash(account.recoveryKey))).toBe(true);
    expect(stored?.key_hash === account.recoveryKey).toBe(false);
    for (const path of ['/api/auth/me', '/api/workspace', '/api/export?format=json']) {
      const response = await request(path, undefined, account.session);
      expect(response.status).toBe(200);
      const value = await response.text();
      expect(value.includes(account.recoveryKey)).toBe(false);
      expect(value.includes(stored!.key_hash)).toBe(false);
    }
    expect(
      (await request('/api/auth/login', { email: account.user.email, password })).headers.get(
        'cache-control',
      ),
    ).toBe('no-store');
  });
  it('uses the same failure for wrong, missing-account, malformed and demo keys', async () => {
    const account = await register();
    const demoResponse = await request('/api/auth/demo', {});
    const demo = await demoResponse.json();
    const inputs = [
      [account.user.email, newRecoveryKey()],
      ['missing@example.test', account.recoveryKey],
      [account.user.email, 'not-a-key'],
      [demo.user.email, newRecoveryKey()],
    ];
    let expected: unknown;
    for (const [email, key] of inputs) {
      const response = await reset(email, key);
      expect(response.status).toBe(401);
      const message = await response.json();
      if (!expected) expected = message;
      else expect(message).toEqual(expected);
    }
    expect(
      (await request('/api/auth/recovery-key', { currentPassword: password }, cookie(demoResponse)))
        .status,
    ).toBe(422);
    expect((await request('/api/auth/me', undefined, account.session)).status).toBe(200);
  });
  it('consumes the old key, rotates the key, changes the password and revokes every previous session', async () => {
    const account = await register();
    const second = await request('/api/auth/login', { email: account.user.email, password });
    const secondSession = cookie(second);
    const recovered = await reset(
      account.user.email,
      account.recoveryKey.toLowerCase().replaceAll('-', ' '),
    );
    expect(recovered.status).toBe(200);
    const result = (await recovered.json()) as RecoveryAuthResult;
    expect(result.recoveryKey === account.recoveryKey).toBe(false);
    for (const session of [account.session, secondSession])
      expect((await request('/api/auth/me', undefined, session)).status).toBe(401);
    expect((await request('/api/auth/me', undefined, cookie(recovered))).status).toBe(200);
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(401);
    expect((await request('/api/auth/login', { email: account.user.email, password })).status).toBe(
      401,
    );
    expect(
      (await request('/api/auth/login', { email: account.user.email, password: nextPassword }))
        .status,
    ).toBe(200);
    expect(
      (await reset(account.user.email, result.recoveryKey, 'A third correct recovery passphrase!'))
        .status,
    ).toBe(200);
  });
  it('allows only one of two concurrent resets with the same key to change credentials or create a session', async () => {
    const account = await register();
    const choices = [
      'First concurrent recovery passphrase!',
      'Second concurrent recovery passphrase!',
    ];
    const responses = await Promise.all(
      choices.map((value) => reset(account.user.email, account.recoveryKey, value)),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    const winner = responses.findIndex((r) => r.status === 200);
    expect(
      (
        await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM sessions WHERE user_id=?', [
          account.user.id,
        ])
      )?.count,
    ).toBe(1);
    expect(
      (await request('/api/auth/login', { email: account.user.email, password: choices[winner] }))
        .status,
    ).toBe(200);
    expect(
      (
        await request('/api/auth/login', {
          email: account.user.email,
          password: choices[1 - winner],
        })
      ).status,
    ).toBe(401);
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(401);
  });
  it('rejects an in-flight login verified against the password replaced by recovery', async () => {
    const account = await register();
    const batch = db.batch.bind(db);
    let release!: () => void, ready!: () => void;
    const waiting = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let pause = true;
    vi.spyOn(db, 'batch').mockImplementation(async (statements) => {
      if (pause && statements[0].sql.startsWith('INSERT INTO sessions')) {
        pause = false;
        ready();
        await gate;
      }
      return batch(statements);
    });
    const pending = request('/api/auth/login', { email: account.user.email, password });
    await waiting;
    const recovered = await reset(account.user.email, account.recoveryKey);
    release();
    const staleLogin = await pending;
    expect(recovered.status).toBe(200);
    expect(staleLogin.status).toBe(401);
    expect(staleLogin.headers.get('set-cookie')).toBeNull();
    expect(
      (
        await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM sessions WHERE user_id=?', [
          account.user.id,
        ])
      )?.count,
    ).toBe(1);
  });
  it('requires the current password to issue/rotate a key and lets pre-existing accounts opt in', async () => {
    const account = await register();
    await db.run('DELETE FROM recovery_keys WHERE user_id=?', [account.user.id]);
    expect(
      (await request('/api/auth/recovery-key', { currentPassword: 'incorrect' }, account.session))
        .status,
    ).toBe(403);
    expect(
      await db.get('SELECT user_id FROM recovery_keys WHERE user_id=?', [account.user.id]),
    ).toBeUndefined();
    const created = await request(
      '/api/auth/recovery-key',
      { currentPassword: password },
      account.session,
    );
    expect(created.status).toBe(200);
    const first = await created.json();
    const replaced = await request(
      '/api/auth/recovery-key',
      { currentPassword: password },
      account.session,
    );
    expect(replaced.status).toBe(200);
    const second = await replaced.json();
    expect((await reset(account.user.email, first.recoveryKey)).status).toBe(401);
    expect((await reset(account.user.email, second.recoveryKey)).status).toBe(200);
  });
  it('allows only one winning credential state when authenticated key replacement races recovery', async () => {
    const account = await register();
    const responses = await Promise.all([
      request('/api/auth/recovery-key', { currentPassword: password }, account.session),
      reset(account.user.email, account.recoveryKey),
    ]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.every((response) => [200, 401, 403, 409].includes(response.status))).toBe(
      true,
    );
    expect(
      (
        await db.get<{ count: number }>(
          'SELECT COUNT(*) AS count FROM security_events WHERE user_id=?',
          [account.user.id],
        )
      )?.count,
    ).toBe(1);
    const winner = await responses.find((response) => response.status === 200)!.json();
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(401);
    expect(
      (
        await reset(
          account.user.email,
          winner.recoveryKey,
          'The winner key proves final credential state!',
        )
      ).status,
    ).toBe(200);
  });
  it('rolls back key consumption, password updates and session revocation together if the transaction fails', async () => {
    const account = await register();
    await db.run(
      "CREATE TRIGGER fail_recovery_audit BEFORE INSERT ON security_events WHEN json_extract(NEW.payload,'$.action')='Account recovered' BEGIN SELECT RAISE(ABORT,'test_recovery_rollback'); END",
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(500);
    expect((await request('/api/auth/me', undefined, account.session)).status).toBe(200);
    expect(
      (
        await db.get<{ key_hash: string }>('SELECT key_hash FROM recovery_keys WHERE user_id=?', [
          account.user.id,
        ])
      )?.key_hash,
    ).toBe(await recoveryKeyHash(account.recoveryKey));
    await db.run('DROP TRIGGER fail_recovery_audit');
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(200);
  });
  it('keeps recovery, key regeneration and password changes available at the business audit quota with bounded declared security retention', async () => {
    const account = await register();
    const time = new Date().toISOString();
    await db.run(
      "WITH RECURSIVE numbers(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM numbers WHERE x<9999) INSERT INTO audits(id,workspace_id,payload,created_at) SELECT 'quota-'||x,?,'{}',? FROM numbers",
      [account.user.workspaceId, time],
    );
    await db.run(
      "WITH RECURSIVE numbers(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM numbers WHERE x<100) INSERT INTO security_events(id,user_id,workspace_id,payload,created_at) SELECT 'security-old-'||x,?,?,'{}','2020-01-01T00:00:00.000Z' FROM numbers",
      [account.user.id, account.user.workspaceId],
    );
    const recovered = await reset(account.user.email, account.recoveryKey);
    expect(recovered.status).toBe(200);
    const session = cookie(recovered);
    expect(
      (await request('/api/auth/recovery-key', { currentPassword: nextPassword }, session)).status,
    ).toBe(200);
    const changed = await request(
      '/api/auth/password',
      { currentPassword: nextPassword, newPassword: 'A final quota-safe password 2026!' },
      session,
    );
    expect(changed.status).toBe(200);
    expect(
      (
        await db.get<{ count: number }>(
          'SELECT COUNT(*) AS count FROM audits WHERE workspace_id=?',
          [account.user.workspaceId],
        )
      )?.count,
    ).toBe(10000);
    expect(
      (
        await db.get<{ count: number }>(
          'SELECT COUNT(*) AS count FROM security_events WHERE user_id=?',
          [account.user.id],
        )
      )?.count,
    ).toBe(100);
    const exported = await (
      await request('/api/export?format=json', undefined, cookie(changed))
    ).json();
    expect(exported.activity).toHaveLength(10000);
    expect(exported.securityEvents).toHaveLength(100);
    expect(exported.securityEventRetention).toContain('Latest 100');
    expect(
      exported.securityEvents.filter((e: { action?: string }) =>
        ['Account recovered', 'Recovery key replaced', 'Password changed'].includes(e.action ?? ''),
      ),
    ).toHaveLength(3);
  });
  it('rate limits recovery failures and cascades key deletion with its account', async () => {
    const account = await register();
    for (let attempt = 0; attempt < 6; attempt++)
      expect((await reset(account.user.email, newRecoveryKey())).status).toBe(401);
    expect((await reset(account.user.email, account.recoveryKey)).status).toBe(429);
    await db.run('DELETE FROM workspaces WHERE id=?', [account.user.workspaceId]);
    expect(
      await db.get('SELECT user_id FROM recovery_keys WHERE user_id=?', [account.user.id]),
    ).toBeUndefined();
  });
});
