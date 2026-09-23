import { createClient, type Client } from '@libsql/client';
import { SCHEMA, type SQLStatement, type SQLValue, type Storage } from './storage';

/** Remote libSQL/Turso storage. No database or authentication token is exposed to the browser. */
export class LibSQLStorage implements Storage {
  readonly kind = 'libsql' as const;
  private constructor(private readonly client: Client) {}
  static async connect(url: string, authToken?: string): Promise<LibSQLStorage> {
    const client = createClient({ url, authToken, intMode: 'number' });
    try {
      // Schema is idempotent; SQLite-compatible triggers enforce quotas and assignment invariants.
      await client.executeMultiple(SCHEMA);
      return new LibSQLStorage(client);
    } catch (error) {
      client.close();
      throw error;
    }
  }
  async all<T>(sql: string, params: SQLValue[] = []) {
    return (await this.client.execute({ sql, args: params })).rows as unknown as T[];
  }
  async get<T>(sql: string, params: SQLValue[] = []) {
    return (await this.all<T>(sql, params))[0];
  }
  async run(sql: string, params: SQLValue[] = []) {
    return { changes: (await this.client.execute({ sql, args: params })).rowsAffected };
  }
  async batch(statements: SQLStatement[]) {
    // The SDK commits all statements as one write transaction or rolls the entire batch back.
    return (
      await this.client.batch(
        statements.map(({ sql, params = [] }) => ({ sql, args: params })),
        'write',
      )
    ).map((result) => ({ changes: result.rowsAffected }));
  }
  close() {
    this.client.close();
  }
}
