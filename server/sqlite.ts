import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA, type SQLStatement, type SQLValue, type Storage } from './storage';

export class SQLiteStorage implements Storage {
  readonly kind = 'sqlite' as const;
  readonly db: DatabaseSync;
  constructor(filename = process.env.DATABASE_PATH || './data/rill.sqlite') {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    this.db.exec(SCHEMA);
    if (filename !== ':memory:') {
      for (const suffix of ['-wal', '-shm'])
        if (existsSync(filename + suffix)) chmodSync(filename + suffix, 0o600);
    }
  }
  async all<T>(sql: string, params: SQLValue[] = []) {
    return this.db.prepare(sql).all(...params) as T[];
  }
  async get<T>(sql: string, params: SQLValue[] = []) {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  async run(sql: string, params: SQLValue[] = []) {
    return { changes: Number(this.db.prepare(sql).run(...params).changes) };
  }
  async batch(statements: SQLStatement[]) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(({ sql, params = [] }) => ({
        changes: Number(this.db.prepare(sql).run(...params).changes),
      }));
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
