# PostgreSQL deployment adaptation

Rill now supports a native PostgreSQL schema alongside its existing SQLite, libSQL, and D1 adapters. The intended Google deployment is Firebase Hosting → Cloud Run → Cloud SQL for PostgreSQL. The API, tenant scoping, decision engine, response shapes, and evidence workflow remain shared. This document records implementation verification; it does not claim the cloud deployment has passed its hosted tests yet.

## Preserved guarantees

- Each write and multi-statement batch uses one checked-out connection and a `SERIALIZABLE` transaction. Serialization failures and deadlocks retry the complete transaction up to four attempts; other failures roll back and propagate. An exhausted conflict becomes a retryable API 409.
- The previous statement's affected-row count is held in a transaction-local setting, read through `rill_changes()`. Conditional audit/security inserts therefore stay coupled to the successful mutation. The setting starts at zero for each batch and cannot leak through the connection pool.
- Native constraints retain unique account emails, observation retry keys, and one open task per site. PostgreSQL triggers retain workspace quotas, valid assignee checks, and protection for members with open tasks. Serializable predicate reads prevent concurrent inserts from independently passing the same quota.
- JSON payloads remain text with narrowly scoped scalar `json_extract`/`json_set` functions. Security events have an explicit sequence column for stable retention ordering. A token-aware scanner adapts unquoted `?` binds and the exact `changes()` call; it never rewrites quoted data, identifiers, or comments and is not a general SQL translator.
- Schema initialization is versioned and protected by a transaction-level advisory lock, so simultaneous cold starts do not race to create it. A five-connection pool is the default; Cloud Run instance limits must account for the database's connection limit.

The one shared query change qualifies rate-limit columns in an upsert so they are unambiguous on PostgreSQL. This syntax also passes the SQLite and libSQL tests. There is no automatic import of an existing SQLite database; this deployment starts with a new isolated database.

## Runtime configuration

Use either `DATABASE_URL=postgresql://...` or standard `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` variables. Keep credentials in the host's secret configuration. For Cloud SQL attached to Cloud Run, use `PGHOST=/cloudsql/PROJECT:REGION:INSTANCE`; the managed connection provides the encrypted transport. A direct TCP deployment must configure verified TLS using the PostgreSQL client's supported configuration.

Set `NODE_ENV=production`, `APP_ORIGIN` to the canonical HTTPS origin, and optionally `APP_ALLOWED_ORIGINS` to a comma-separated list of additional exact origins. Paths, trailing slashes, wildcard hostnames, and unlisted origins are rejected. Cloud Run automatically selects `__session`, the cookie name Firebase Hosting forwards; `SESSION_COOKIE_NAME` can explicitly choose `__session` or the original `rill_session`. Sessions retain HttpOnly, Secure in production, SameSite=Lax, expiry, and server-side revocation. Unknown API routes return JSON rather than the SPA HTML.

When `K_SERVICE` identifies Cloud Run, startup requires PostgreSQL or remote libSQL and an HTTPS application origin. It never silently falls back to a disposable local SQLite database. `HOST` defaults to `0.0.0.0` there. Cloud Run uses explicit persistent service-wide authentication, demo, recovery, and registration budgets while preserving account limits. It does not treat a gateway socket or forwarding header as an end-user identity. See [Firebase ingress and budget configuration](firebase-proxy-trust.md) for the shared-budget limitation and bounded settings.

## Local verification

An isolated local PostgreSQL 15 cluster was used, with a fresh random schema for each test. **The original PostgreSQL adaptation passed 46 tests: 30 backend API tests, 10 recovery tests, four native PostgreSQL invariant tests, and two scanner tests.** The native cases cover late-statement rollback, conditional audits, concurrent quota writers, serialization retries, zeroed transaction state, scalar JSON/null behavior, and schema reinitialization. Scanner tests exercise quoted markers and rejected malformed or multi-statement SQL. Type checking and formatting passed. The existing default SQLite/libSQL suite also passed, as did a separate full libSQL API run. The later aggregate-rate changes add four API tests and three configuration tests; CI includes these with the PostgreSQL suite.

A separate HTTP smoke check started the real Node server with Cloud Run environment settings against the isolated local PostgreSQL database. It verified the Secure/HttpOnly `__session` cookie, created an observation, stopped and restarted the process, recovered the same authenticated session and observation, verified JSON API 404, and deleted its synthetic workspace. This establishes process-restart persistence locally; the final public Firebase origin still requires its own hosted validation.

```sh
RILL_TEST_STORAGE=postgres \
RILL_TEST_POSTGRES_URL=postgresql://USER@127.0.0.1:PORT/DATABASE \
npx vitest run tests/backend.test.ts tests/recovery.test.ts tests/postgres.test.ts tests/rate-config.test.ts
```

This test URL must name a database in which the test operator can create and drop isolated `rill_test_*` schemas. Never point it at an unrelated production database. Default tests retain SQLite/libSQL coverage; PostgreSQL-specific live tests skip unless the explicit test URL is set.

Sources checked 23 September 2026: [Firebase Hosting cookies](https://firebase.google.com/docs/hosting/manage-cache), [Hosting with Cloud Run and billing](https://firebase.google.com/docs/hosting/cloud-run), [Cloud Run disposable filesystem](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run), [Cloud Storage FUSE locking limitations](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts), [Cloud SQL connections from Cloud Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run), [node-postgres transactions](https://node-postgres.com/features/transactions), [PostgreSQL serializable isolation](https://www.postgresql.org/docs/17/transaction-iso.html).
