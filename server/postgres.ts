import { Pool, types, type PoolClient, type PoolConfig } from 'pg';
import type { SQLStatement, SQLValue, Storage } from './storage';

/** Native PostgreSQL schema. JSON payloads stay text so all existing API serialization is retained. */
export const POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, scenario_date TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('coordinator','volunteer')), password_hash TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS users_workspace ON users(workspace_id);
CREATE TABLE IF NOT EXISTS recovery_keys (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, key_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS security_events (rowid BIGSERIAL UNIQUE, id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS security_events_user_time ON security_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS sites (id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, payload TEXT NOT NULL, PRIMARY KEY(workspace_id,id));
CREATE TABLE IF NOT EXISTS observations (id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, author_id TEXT NOT NULL, client_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,author_id,client_id));
CREATE INDEX IF NOT EXISTS observations_workspace ON observations(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS photos (observation_id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, data_url TEXT NOT NULL, byte_length INTEGER NOT NULL, PRIMARY KEY(workspace_id,observation_id));
CREATE TABLE IF NOT EXISTS tasks (id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, observation_id TEXT NOT NULL, site_id TEXT NOT NULL, assigned_user_id TEXT, status TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(workspace_id,id));
CREATE UNIQUE INDEX IF NOT EXISTS one_open_site_task ON tasks(workspace_id,site_id) WHERE status != 'completed';
CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS audits_workspace ON audits(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at BIGINT NOT NULL);

-- These two compatibility functions intentionally support only Rill's scalar object paths.
CREATE OR REPLACE FUNCTION json_extract(document TEXT, path TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
BEGIN
  IF path !~ '^\\$\\.[A-Za-z][A-Za-z0-9_]*$' THEN RAISE EXCEPTION 'Unsupported Rill JSON path'; END IF;
  RETURN document::jsonb ->> substring(path FROM 3);
END $$;
CREATE OR REPLACE FUNCTION json_set(document TEXT, path TEXT, value TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF path IS NULL OR path !~ '^\\$\\.[A-Za-z][A-Za-z0-9_]*$' THEN RAISE EXCEPTION 'Unsupported Rill JSON path'; END IF;
  RETURN jsonb_set(document::jsonb, ARRAY[substring(path FROM 3)], COALESCE(to_jsonb(value),'null'::jsonb), true)::text;
END $$;
CREATE OR REPLACE FUNCTION rill_changes() RETURNS BIGINT
LANGUAGE SQL STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('rill.last_changes', true),''),'0')::bigint $$;

-- Every application write runs in a SERIALIZABLE transaction. Predicate reads in these
-- triggers therefore cannot permit concurrent inserts to bypass a quota.
CREATE OR REPLACE FUNCTION rill_check_quota() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE total BIGINT; cap BIGINT;
BEGIN
  cap := TG_ARGV[0]::bigint;
  IF TG_TABLE_NAME = 'photos' THEN
    SELECT COALESCE(SUM(byte_length),0) INTO total FROM photos WHERE workspace_id=NEW.workspace_id;
    IF total + NEW.byte_length > cap THEN RAISE EXCEPTION 'rill_quota_exceeded'; END IF;
  ELSE
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE workspace_id=$1', TG_TABLE_NAME) INTO total USING NEW.workspace_id;
    IF total >= cap THEN RAISE EXCEPTION 'rill_quota_exceeded'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER limit_audits BEFORE INSERT ON audits FOR EACH ROW EXECUTE FUNCTION rill_check_quota('10000');
CREATE TRIGGER limit_sites BEFORE INSERT ON sites FOR EACH ROW EXECUTE FUNCTION rill_check_quota('100');
CREATE TRIGGER limit_observations BEFORE INSERT ON observations FOR EACH ROW EXECUTE FUNCTION rill_check_quota('2000');
CREATE TRIGGER limit_tasks BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION rill_check_quota('2000');
CREATE TRIGGER limit_members BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION rill_check_quota('50');
CREATE TRIGGER limit_photos BEFORE INSERT ON photos FOR EACH ROW EXECUTE FUNCTION rill_check_quota('50000000');
CREATE OR REPLACE FUNCTION rill_require_task_assignee() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.assigned_user_id AND workspace_id=NEW.workspace_id) THEN
    RAISE EXCEPTION 'rill_assignment_not_found';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER require_task_assignee BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION rill_require_task_assignee();
CREATE OR REPLACE FUNCTION rill_protect_active_member() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM workspaces WHERE id=OLD.workspace_id) AND EXISTS(SELECT 1 FROM tasks WHERE workspace_id=OLD.workspace_id AND assigned_user_id=OLD.id AND status!='completed') THEN
    RAISE EXCEPTION 'rill_member_has_open_tasks';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER protect_active_member BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION rill_protect_active_member();
`;

/**
 * Port only the two syntactic differences in the application's audited SQL:
 * unquoted ? bind markers, and unquoted changes(). Strings/identifiers/comments
 * are copied untouched. This is not a general SQLite-to-PostgreSQL translator.
 */
export function postgresStatement(sql: string, parameterCount: number): string {
  let result = '',
    index = 0,
    bindings = 0;
  while (index < sql.length) {
    const char = sql[index];
    if (char === "'" || char === '"') {
      const quote = char;
      result += char;
      index++;
      let closed = false;
      while (index < sql.length) {
        const current = sql[index++];
        result += current;
        if (current === quote) {
          if (sql[index] === quote) result += sql[index++];
          else {
            closed = true;
            break;
          }
        }
      }
      if (!closed) throw new Error('Unterminated SQL literal');
    } else if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index);
      const stop = end === -1 ? sql.length : end;
      result += sql.slice(index, stop);
      index = stop;
    } else if (sql.startsWith('/*', index)) {
      const end = sql.indexOf('*/', index + 2);
      if (end === -1) throw new Error('Unterminated SQL comment');
      result += sql.slice(index, end + 2);
      index = end + 2;
    } else if (char === '?') {
      result += `$${++bindings}`;
      index++;
    } else if (/[A-Za-z_]/.test(char)) {
      const start = index++;
      while (index < sql.length && /[A-Za-z0-9_]/.test(sql[index])) index++;
      const token = sql.slice(start, index);
      if (token.toLowerCase() === 'changes' && sql.slice(index, index + 2) === '()') {
        result += 'rill_changes()';
        index += 2;
      } else result += token;
    } else {
      // No unreviewed PostgreSQL positional markers or dollar-quoted statements enter this path.
      if (char === '$') throw new Error('Unsupported SQL syntax in application statement');
      if (char === ';')
        throw new Error('Application storage accepts one statement per batch entry');
      result += char;
      index++;
    }
  }
  if (bindings !== parameterCount)
    throw new Error('SQL parameter count does not match bind markers');
  return result;
}

function publicDatabaseError(error: unknown): Error {
  const code = (error as { code?: string })?.code;
  // Existing API conflict handling recognizes SQLite's UNIQUE marker; no SQL values are exposed.
  if (code === '23505') return new Error('UNIQUE constraint violation');
  if (code === '40001' || code === '40P01') return new Error('rill_serialization_conflict');
  return error instanceof Error ? error : new Error('PostgreSQL operation failed');
}

export class PostgresStorage implements Storage {
  readonly kind = 'postgres' as const;
  private constructor(private readonly pool: Pool) {}

  static async connect(
    connectionString?: string,
    configuration: { schema?: string; max?: number } = {},
  ) {
    const schema = configuration.schema ?? 'public';
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid database schema');
    const maximum = configuration.max ?? 5;
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 20)
      throw new Error('Invalid database pool size');
    const config: PoolConfig = {
      ...(connectionString ? { connectionString } : {}),
      max: maximum,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
      options: `-c search_path=${schema} -c idle_in_transaction_session_timeout=20000`,
      types: {
        getTypeParser: (oid, format) =>
          oid === 20
            ? (value: string) => {
                const number = Number(value);
                if (!Number.isSafeInteger(number))
                  throw new Error('Database integer exceeds safe application range');
                return number;
              }
            : types.getTypeParser(oid, format),
      },
    };
    const pool = new Pool(config);
    pool.on('error', () => console.error('An idle PostgreSQL connection was interrupted.'));
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(1720, hashtext(current_schema()))');
        await client.query(
          'CREATE TABLE IF NOT EXISTS rill_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
        );
        const migration = await client.query('SELECT version FROM rill_migrations WHERE version=1');
        if (!migration.rowCount) {
          await client.query(POSTGRES_SCHEMA);
          await client.query('INSERT INTO rill_migrations(version) VALUES(1)');
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return new PostgresStorage(pool);
    } catch (error) {
      await pool.end();
      throw publicDatabaseError(error);
    }
  }

  async all<T>(sql: string, params: SQLValue[] = []): Promise<T[]> {
    try {
      return (await this.pool.query(postgresStatement(sql, params.length), params)).rows as T[];
    } catch (error) {
      throw publicDatabaseError(error);
    }
  }
  async get<T>(sql: string, params: SQLValue[] = []): Promise<T | undefined> {
    return (await this.all<T>(sql, params))[0];
  }
  async run(sql: string, params: SQLValue[] = []) {
    return (await this.batch([{ sql, params }]))[0];
  }
  async batch(statements: SQLStatement[]) {
    if (!statements.length) return [];
    const prepared = statements.map(({ sql, params = [] }) => ({
      sql: postgresStatement(sql, params.length),
      params,
    }));
    for (let attempt = 0; attempt < 4; attempt++) {
      const client: PoolClient = await this.pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        await client.query("SELECT set_config('rill.last_changes','0',true)");
        const results = [];
        for (const statement of prepared) {
          const result = await client.query(statement.sql, statement.params);
          const changes = result.rowCount ?? 0;
          results.push({ changes });
          if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command))
            await client.query("SELECT set_config('rill.last_changes',$1,true)", [String(changes)]);
        }
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        const code = (error as { code?: string })?.code;
        if (attempt === 3 || (code !== '40001' && code !== '40P01'))
          throw publicDatabaseError(error);
      } finally {
        client.release();
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
    throw new Error('rill_serialization_conflict');
  }
  async close() {
    await this.pool.end();
  }
}
