import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

// Supply connection secrets through the child environment, never command arguments.
// This creates/drops only its own newly generated disposable database. The source
// is read in a repeatable-read transaction, shared with pg_dump via a snapshot.
if (process.env.RILL_ALLOW_RESTORE_DRILL !== 'true')
  throw new Error('Set RILL_ALLOW_RESTORE_DRILL=true to permit a disposable database restore.');
if (!process.env.PGDATABASE || !process.env.PGUSER || !process.env.PGHOST)
  throw new Error('PGDATABASE, PGUSER, and PGHOST must explicitly identify the source.');
if (process.env.DATABASE_URL)
  throw new Error('Use discrete PG connection variables, not DATABASE_URL, for this drill.');

const started = new Date();
const suffix = `${Date.now()}_${randomBytes(4).toString('hex')}`;
const destination = `rill_restore_check_${suffix}`;
const sourceName = process.env.PGDATABASE;
const directory = resolve('backups');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const archive = join(directory, `rill-postgres-${suffix}.dump`);
const manifest = join(directory, `rill-postgres-${suffix}.json`);
const pgBin = process.env.PG_BIN;
const executable = (name) => (pgBin ? join(pgBin, name) : name);
const quoted = (name) => `"${name.replaceAll('"', '""')}"`;
const client = (database) => new Client({ database, connectionTimeoutMillis: 15_000 });
const source = client(sourceName);
let restored;
let created = false;
let snapshotOpen = false;
let cleanupComplete = false;
let outcome;

async function program(name, args, output = 'ignore') {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(executable(name), args, {
      env: { ...process.env, PGAPPNAME: 'rill-logical-restore-drill', PGCONNECT_TIMEOUT: '15' },
      stdio: ['ignore', output, 'pipe'],
      timeout: 180_000,
    });
    // CLI diagnostics can include SQL values. Never relay them to the console.
    let warnings = 0;
    child.stderr.on('data', (chunk) => {
      warnings += chunk.length;
    });
    child.on('error', () => reject(new Error(`${name} could not start.`)));
    child.on('close', (code) =>
      code === 0 && warnings === 0
        ? resolvePromise()
        : reject(
            new Error(`${name} failed or emitted diagnostics; exit=${code}. Details withheld.`),
          ),
    );
  });
}

async function inventory(connection) {
  const names = (
    await connection.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    )
  ).rows.map((row) => row.tablename);
  if (!names.includes('rill_migrations') || !names.includes('workspaces'))
    throw new Error('The source does not contain the expected Rill schema.');
  const tables = {};
  for (const name of names) {
    const result = await connection.query(
      `SELECT COUNT(*)::integer AS count, md5(COALESCE(string_agg(row_hash,',' ORDER BY row_hash),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM public.${quoted(name)} t) rows`,
    );
    tables[name] = result.rows[0];
  }
  const schema = (
    await connection.query(`
    SELECT 'constraint' AS kind, c.relname AS object, p.conname AS name, pg_get_constraintdef(p.oid) AS definition
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    UNION ALL SELECT 'index', tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public'
    UNION ALL SELECT 'trigger', c.relname, t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
    UNION ALL SELECT 'function', p.proname, pg_get_function_identity_arguments(p.oid), pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    ORDER BY kind, object, name
  `)
  ).rows;
  return {
    tables,
    schemaFingerprint: createHash('sha256').update(JSON.stringify(schema)).digest('hex'),
    schemaObjects: schema.length,
  };
}

async function mustReject(connection, sql, params, marker) {
  await connection.query('SAVEPOINT expected_rejection');
  let rejected = false;
  try {
    await connection.query(sql, params);
  } catch (error) {
    rejected = String(error.message).includes(marker) || error.code === marker;
  }
  await connection.query('ROLLBACK TO SAVEPOINT expected_rejection');
  if (!rejected) throw new Error(`Restored invariant did not reject: ${marker}`);
}

try {
  await source.connect();
  const privileges = (
    await source.query(`SELECT
    current_user = pg_get_userbyid(d.datdba) AS owns_database,
    r.rolcreatedb AS can_create_database, r.rolcreaterole AS can_create_role,
    pg_has_role(current_user,'cloudsqlsuperuser','MEMBER') AS cloudsqlsuperuser_member,
    has_schema_privilege(current_user,'public','CREATE') AS can_create_in_public,
    (SELECT COUNT(*)::integer FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','S') AND c.relowner<>r.oid) AS other_owned_relations,
    (SELECT COUNT(*)::integer FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proowner<>r.oid) AS other_owned_functions
    FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`)
  ).rows[0];
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  snapshotOpen = true;
  const snapshot = (await source.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
  const before = await inventory(source);
  const file = openSync(archive, 'wx', 0o600);
  try {
    await program(
      'pg_dump',
      ['--format=custom', '--no-acl', '--lock-wait-timeout=10s', `--snapshot=${snapshot}`],
      file,
    );
  } finally {
    closeSync(file);
  }
  await source.query('COMMIT');
  snapshotOpen = false;
  // The destination cannot be supplied by the caller and never uses --clean.
  if (!/^rill_restore_check_\d+_[a-f0-9]{8}$/.test(destination) || destination === sourceName)
    throw new Error('Invalid disposable database name.');
  await source.query(`CREATE DATABASE ${quoted(destination)} TEMPLATE template0`);
  created = true;
  await program('pg_restore', [
    '--exit-on-error',
    '--no-owner',
    '--no-acl',
    '--dbname',
    destination,
    archive,
  ]);
  restored = client(destination);
  await restored.connect();
  const after = await inventory(restored);
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('Restored inventory does not match the exported snapshot.');
  const invalidConstraints = (
    await restored.query(
      "SELECT COUNT(*)::integer AS count FROM pg_constraint WHERE NOT convalidated AND connamespace='public'::regnamespace",
    )
  ).rows[0].count;
  if (invalidConstraints) throw new Error('Restored constraints were not validated.');
  const invalidIndexes = (
    await restored.query(
      "SELECT COUNT(*)::integer AS count FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relnamespace='public'::regnamespace AND NOT i.indisvalid",
    )
  ).rows[0].count;
  if (invalidIndexes) throw new Error('Restored indexes are invalid.');
  const drillId = `restore-drill-${suffix}`;
  await restored.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await restored.query('INSERT INTO workspaces(id,name,created_at) VALUES($1,$2,$3)', [
    drillId,
    'Restore invariant check',
    started.toISOString(),
  ]);
  await mustReject(
    restored,
    'INSERT INTO users(id,workspace_id,email,name,role,created_at) VALUES($1,$2,$3,$4,$5,$6)',
    [
      drillId,
      `missing-${drillId}`,
      `${drillId}@example.invalid`,
      'Restore check',
      'coordinator',
      started.toISOString(),
    ],
    '23503',
  );
  await restored.query(
    "INSERT INTO sites(id,workspace_id,payload) SELECT 'drill-site-'||n,$1,'{}' FROM generate_series(1,100) n",
    [drillId],
  );
  await mustReject(
    restored,
    "INSERT INTO sites(id,workspace_id,payload) VALUES('drill-overflow',$1,'{}')",
    [drillId],
    'rill_quota_exceeded',
  );
  await restored.query(
    "INSERT INTO tasks(id,workspace_id,observation_id,site_id,status,payload) VALUES('drill-task',$1,'drill-observation','drill-site-1','assigned','{}')",
    [drillId],
  );
  await mustReject(
    restored,
    "INSERT INTO tasks(id,workspace_id,observation_id,site_id,status,payload) VALUES('drill-task-duplicate',$1,'drill-observation','drill-site-1','assigned','{}')",
    [drillId],
    '23505',
  );
  await mustReject(
    restored,
    "INSERT INTO tasks(id,workspace_id,observation_id,site_id,assigned_user_id,status,payload) VALUES('drill-task-member',$1,'drill-observation','drill-site-2','missing-member','assigned','{}')",
    [drillId],
    'rill_assignment_not_found',
  );
  await restored.query('ROLLBACK');
  if (JSON.stringify(after) !== JSON.stringify(await inventory(restored)))
    throw new Error('Rollback changed restored records.');
  outcome = {
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    sourceDatabase: sourceName,
    archive,
    bytes: statSync(archive).size,
    mode: (statSync(archive).mode & 0o777).toString(8),
    archiveSHA256: createHash('sha256').update(readFileSync(archive)).digest('hex'),
    tables: before.tables,
    schemaObjects: before.schemaObjects,
    schemaFingerprint: before.schemaFingerprint,
    checks: {
      exactSnapshotContents: true,
      validatedConstraints: true,
      validIndexes: true,
      foreignKey: true,
      siteQuota: true,
      uniqueOpenTask: true,
      taskAssignee: true,
      rollback: true,
    },
    privileges,
  };
} finally {
  try {
    if (snapshotOpen) await source.query('ROLLBACK').catch(() => {});
    await restored?.end();
    if (created) {
      try {
        await source.query(`DROP DATABASE ${quoted(destination)}`);
        cleanupComplete =
          (await source.query('SELECT 1 FROM pg_database WHERE datname=$1', [destination]))
            .rowCount === 0;
      } catch {
        throw new Error(`Disposable cleanup failed; inspect only ${destination}.`);
      }
    }
  } finally {
    await source.end();
  }
}
if (!outcome || !cleanupComplete)
  throw new Error('Restore drill or disposable cleanup did not finish.');
outcome.disposableDatabaseRemoved = true;
writeFileSync(manifest, JSON.stringify(outcome, null, 2), { flag: 'wx', mode: 0o600 });
console.log(
  JSON.stringify(
    {
      status: 'passed',
      archive,
      manifest,
      bytes: outcome.bytes,
      mode: outcome.mode,
      tableCount: Object.keys(outcome.tables).length,
      schemaObjects: outcome.schemaObjects,
      rowCounts: Object.fromEntries(
        Object.entries(outcome.tables).map(([name, row]) => [name, row.count]),
      ),
      checks: outcome.checks,
      privileges: outcome.privileges,
      disposableDatabaseRemoved: true,
    },
    null,
    2,
  ),
);
