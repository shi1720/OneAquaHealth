import { afterEach, expect, test } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupSQLite } from '../server/backup';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'rill-backup-'));
  directories.push(directory);
  const source = join(directory, 'source.sqlite');
  const database = new DatabaseSync(source);
  database.exec(
    'PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE evidence(id INTEGER PRIMARY KEY, note TEXT NOT NULL);',
  );
  return { directory, source, database };
}

test('restores committed WAL records from a live database into a private standalone snapshot', async () => {
  const { directory, source, database } = fixture();
  try {
    database.prepare('INSERT INTO evidence(note) VALUES(?)').run('Committed follow-up evidence');
    expect(statSync(`${source}-wal`).size).toBeGreaterThan(0);
    const destination = join(directory, 'snapshot.sqlite');
    await backupSQLite(source, destination);
    expect(statSync(destination).mode & 0o777).toBe(0o600);
    const restored = new DatabaseSync(destination, { readOnly: true });
    try {
      expect(restored.prepare('SELECT note FROM evidence').all()).toEqual([
        { note: 'Committed follow-up evidence' },
      ]);
      expect(restored.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    } finally {
      restored.close();
    }
  } finally {
    database.close();
  }
});

test('refuses to overwrite an existing backup or the source, and rejects a missing source', async () => {
  const { directory, source, database } = fixture();
  try {
    const destination = join(directory, 'existing.sqlite');
    writeFileSync(destination, 'previous backup must remain untouched');
    await expect(backupSQLite(source, destination)).rejects.toThrow();
    expect(readFileSync(destination, 'utf8')).toBe('previous backup must remain untouched');
    await expect(backupSQLite(source, source)).rejects.toThrow('separate from the live database');
    await expect(
      backupSQLite(join(directory, 'missing.sqlite'), join(directory, 'new.sqlite')),
    ).rejects.toThrow();
  } finally {
    database.close();
  }
});
