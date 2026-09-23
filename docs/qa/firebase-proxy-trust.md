# Firebase ingress and database capacity review

Research checked 23 September 2026. This is a deployment design review, not a claim that hosted forwarding headers have already been tested. No cloud resources were changed for this review.

## Forwarding headers are not automatically client identity

Google's external Application Load Balancer appends the connecting client and load-balancer addresses to `X-Forwarded-For`; preceding values are unverified. Additional backend proxies can extend that chain. This is a documented contract for that load-balancer product, not proof that the default Cloud Run edge or Firebase Hosting uses a fixed number of hops. [Google load-balancer header documentation](https://docs.cloud.google.com/load-balancing/docs/https#x-forwarded-for_header).

No official fixed-hop contract was found for ordinary Firebase Hosting rewrites to Cloud Run. The Cloud Run functions header reference describes the first address as generally the original client; it does not establish authenticated provenance. A caller can also reach a public Cloud Run origin directly. A parser that assumes the longer Hosting path can therefore select a caller-supplied address on the shorter path. [Cloud Run functions headers](https://docs.cloud.google.com/functions/docs/reference/headers).

`Fastly-Client-IP` is not independently trustworthy: Fastly documents that an incoming value is retained unless the service explicitly overwrites it. Firebase's managed configuration has not been shown to guarantee that overwrite. Do not use this header as a security boundary. [Fastly header reference](https://www.fastly.com/documentation/reference/http/http-headers/Fastly-Client-IP/).

Disabling the default Cloud Run URL is not a drop-in remedy: Google explicitly lists Firebase Hosting among services that depend on that URL. An ingress restriction for an owned external load balancer must not be assumed to preserve ordinary Hosting rewrites. [Cloud Run ingress controls](https://docs.cloud.google.com/run/docs/securing/ingress).

## Release decision procedure

1. Inspect temporary, access-controlled diagnostics through both Firebase aliases and the direct Cloud Run origin. Try no forwarding headers, invented prefixes, repeated headers, and malformed values. Retain only masked shapes in the review record; remove diagnostics afterward.
2. A successful spot check is empirical evidence, not a permanent platform contract. Only select an address relative to a trusted suffix when the suffix has an established provenance for **every reachable ingress path**. Bound header size and list length, validate literal IP syntax, normalize representations, and fall back conservatively on ambiguity.
3. Do not trust the leftmost address, a hostname header, or all Google/Fastly IP ranges. Shared providers are not equivalent to this application's trusted proxy.
4. If trustworthy per-client identity cannot be established, describe the socket limit as an aggregate gateway guard. Keep account/session/workspace limits and document the shared-limit availability tradeoff. A CAPTCHA or App Check integration would be additional work, not an existing guarantee.

A stronger future topology uses an owned edge that overwrites identity from connection metadata, restricts origin access, and applies edge rate limits. A private Cloud Run backend can require a service-account ID token from a controlled proxy, but the proxy still needs a trustworthy client signal. This is not an automatic property of Firebase Hosting. [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

## Implemented Cloud Run mode

The Node runtime automatically uses **aggregate service budgets** when `K_SERVICE` is present. These counters share the persistent database across instances and use explicit `aggregate:*` keys; neither socket identity nor forwarding headers participate. This is intentionally not per-visitor rate limiting. Direct Cloud Run and Firebase Hosting requests consume the same budget.

| Environment variable                     | Default | Maximum | Window     |
| ---------------------------------------- | ------: | ------: | ---------- |
| `RILL_AGGREGATE_AUTH_PER_15_MINUTES`     |     240 |   1,000 | 15 minutes |
| `RILL_AGGREGATE_DEMOS_PER_HOUR`          |      60 |     500 | 1 hour     |
| `RILL_AGGREGATE_RECOVERY_PER_15_MINUTES` |      60 |     250 | 15 minutes |
| `RILL_AGGREGATE_REGISTRATIONS_PER_HOUR`  |      30 |     100 | 1 hour     |

Overrides must be positive decimal integers within the stated bounds; malformed values fail startup. All authentication POSTs count toward the authentication budget, including the more specifically limited operations. This limits expensive credential work and database growth without assuming a gateway socket represents one person. It does not prevent one abusive caller from exhausting a shared budget and temporarily affecting others. Assess traffic and add a trustworthy edge or challenge mechanism before broader launch; raising these budgets is not a substitute for that work.

Existing per-email login (12 per 15 minutes) and recovery (6 per 15 minutes), account read/write/password/recovery-key limits, and workspace data quotas remain active. Local Node and Cloudflare runtimes retain their existing connection-derived limits. Counters survive process restarts and reset when their fixed window expires. API tests cover instance sharing, expiry, forged-header irrelevance, registration protection, and retained account limits.

CI runs the PostgreSQL API, recovery, transaction, and budget configuration tests against an ephemeral PostgreSQL 15 service. Each database integration test owns a fresh random schema and removes it afterward; CI never connects to the hosted database.

## Small Cloud SQL instance

The documented default for a tiny approximately 0.5 GB PostgreSQL instance is 25 connections. Recommend `PGPOOL_MAX=3` and a Cloud Run maximum of two instances initially, leaving room for deployment overlap, administration, and platform connections. This is a capacity recommendation, not a throughput measurement. Do not raise the database connection limit without a memory assessment. [Cloud SQL PostgreSQL flags](https://docs.cloud.google.com/sql/docs/postgres/flags).

Check the actual new database before release:

```sql
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT current_user, current_database(),
  has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
  has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_schema,
  has_schema_privilege(current_user, 'public', 'CREATE') AS can_migrate;
```

Built-in users created through Cloud SQL normally receive `cloudsqlsuperuser`, `CREATEROLE`, and `CREATEDB`. These attributes are not a substitute for checking schema privileges in the intended database. Rill's startup migrations need schema creation privileges; grant only in the dedicated Rill database. A later separate migration identity can reduce runtime DDL privileges. [Cloud SQL user roles](https://docs.cloud.google.com/sql/docs/postgres/create-manage-users).
