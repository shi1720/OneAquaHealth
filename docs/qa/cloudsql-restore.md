# Cloud SQL logical restore drill

**Passed on 23 September 2026.** The live Rill PostgreSQL 15 database was read through the authenticated local Cloud SQL proxy. Its application records were not changed by the drill. A new, uniquely named disposable database was created for restoration and removed afterward; a catalog query confirmed its removal.

The source snapshot began at **05:45:51 UTC**. Verification finished at **05:47:18 UTC**, before disposable cleanup. These timings describe this small test only and are not a recovery-time commitment.

## What was verified

- A repeatable-read, read-only transaction exported a snapshot to `pg_dump`. Counts and row fingerprints therefore refer to the same committed snapshot even while the live application changes.
- A **32,684-byte custom-format archive** restored successfully using `pg_restore --exit-on-error --no-owner --no-acl` into a fresh database. No existing database was overwritten and no `--clean` option was used.
- All **12 public tables**, comprising **87 rows**, matched their snapshot counts and complete-row fingerprints. All **61 catalog definitions** covering constraints, indexes, application triggers, and functions matched.
- Restored constraints were validated and indexes valid. Disposable transactions confirmed foreign-key rejection, the 100-site workspace quota, the unique open task per site, the task-assignee check, and rollback without changing restored contents.
- The archive and its verification manifest were created with file mode **0600** under ignored `backups/`. Neither credentials nor account data were printed or committed. The dump contains sensitive database records and is not a public deliverable.

The small snapshot contained two workspaces. Photos, recovery keys, and security events were empty: their schema was restored and compared, but this drill did not demonstrate populated data recovery for those three tables. No authentication secrets were used from the restored records.

## Reproduce safely

Use [the restore-drill script](../../scripts/deploy/postgres-restore-drill.mjs) with PostgreSQL 15 client tools, an authenticated database connection, and an authorized maintenance identity. Supply `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and the credential through its child process environment. `PG_BIN` can point to the PostgreSQL client binaries. Do not put passwords in command arguments or source files.

```sh
RILL_ALLOW_RESTORE_DRILL=true node scripts/deploy/postgres-restore-drill.mjs
```

The explicit flag enables creation and deletion of one generated `rill_restore_check_*` database. The script accepts no destination database name, refuses a connection-URL override, checks for Rill's source schema, uses exclusive local file creation, and drops only a database it created. Successful runs retain a private manifest with archive digest, snapshot fingerprints, and checks. A failed run without a success manifest is not a verified backup. After runtime privilege reduction, use a separate maintenance identity with the required source-read and database-creation privileges.

## Runtime privilege review

Read-only inspection confirmed `rill_app` owns the application database and all public application tables, sequences, and functions. The `public` schema is owned by `pg_database_owner`; the account can use PL/pgSQL. It initially had `CREATEDB`, `CREATEROLE`, and membership in `cloudsqlsuperuser`, although it was not a true PostgreSQL superuser.

**Completed after the restore drill, with explicit operator authorization:** one transaction revoked `cloudsqlsuperuser` membership and set `NOCREATEDB NOCREATEROLE` for `rill_app`. Guards verified the exact database/user and retained ownership/schema permissions before commit. A fresh connection confirmed membership and both creation attributes are false, while `LOGIN`, database ownership, and public-schema usage/creation remain true. A disposable table, PL/pgSQL function, and trigger were created and exercised in a transaction, then rolled back; cleanup was verified. A new `PostgresStorage.connect()` also completed normal startup migration initialization successfully. Application records were not modified.

The runtime no longer manages cluster-wide roles or databases. It still owns its application schema and can perform migration DDL; a separate migration identity remains a further hardening option. The project operator retains a Cloud SQL administrative recovery path. Database/object ownership is independent of these removed attributes. [PostgreSQL role grants](https://www.postgresql.org/docs/15/sql-grant.html), [ALTER ROLE](https://www.postgresql.org/docs/15/sql-alterrole.html), [Cloud SQL roles](https://docs.cloud.google.com/sql/docs/postgres/users).

## Limits of this evidence

This is a logical application-database restore drill. **Cloud SQL platform backup restoration, point-in-time recovery, regional disaster recovery, and application cutover were not exercised.** The dump does not restore cluster-wide users/IAM, networking, secrets, or platform configuration. Owner and ACL restoration were deliberately omitted for the isolated target. A local private archive is not an off-site backup policy. [PostgreSQL logical backup scope](https://www.postgresql.org/docs/15/app-pgdump.html).
