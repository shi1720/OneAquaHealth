import { backup, DatabaseSync } from 'node:sqlite';
import { closeSync, mkdirSync, openSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A consistent local snapshot, including committed WAL data. Never overwrites a file. */
export async function backupSQLite(sourcePath: string, destinationPath: string) {
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination)
    throw new Error('Choose a new path, separate from the live database.');
  // readOnly also prevents accidentally creating an empty database for a typo.
  const database = new DatabaseSync(source, { readOnly: true });
  let created = false;
  try {
    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    const file = openSync(destination, 'wx', 0o600);
    closeSync(file);
    created = true;
    const pages = await backup(database, destination);
    const verification = new DatabaseSync(destination, { readOnly: true });
    try {
      const rows = verification.prepare('PRAGMA quick_check').all();
      if (rows.length !== 1 || Object.values(rows[0])[0] !== 'ok') {
        throw new Error('The snapshot failed SQLite quick_check. No verified backup was retained.');
      }
    } finally {
      verification.close();
    }
    return { destination, pages };
  } catch (error) {
    if (created) unlinkSync(destination);
    throw error;
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      throw new Error(
        'This command backs up local SQLite only. Use the remote provider’s backup procedure.',
      );
    }
    const destination = process.argv[2];
    if (!destination) throw new Error('Usage: npm run backup -- backups/rill-YYYY-MM-DD.sqlite');
    const result = await backupSQLite(process.env.DATABASE_PATH || 'data/rill.sqlite', destination);
    console.log(`Verified private SQLite snapshot: ${result.destination} (${result.pages} pages).`);
    console.log(
      'Treat this file as sensitive. Test restore separately and apply your retention policy.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Backup failed.');
    process.exitCode = 1;
  }
}
