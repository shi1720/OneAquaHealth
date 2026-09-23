# Firebase deployment

Public application: **https://rill-streams.web.app**. The alternate Firebase domain is https://rill-streams.firebaseapp.com. Firebase serves the built React application and forwards `/api/**` to Cloud Run in the same origin. PostgreSQL holds application data independently of container revisions.

## Reproduce a deployment

Use Node 22.16+, Python 3, Git, Google Cloud CLI and authenticated Firebase CLI access to the existing project. No OpenAI key is required. Run from the repository root:

```sh
python3 scripts/deploy/firebase.py
```

The script builds the application and container, deploys the API with its pinned Secret Manager reference, deploys Firebase Hosting, verifies PostgreSQL health/version, and runs the disposable API smoke workflow. It uses argument arrays rather than shell interpolation and never reads or prints the database password. Use `--verify-only` for the public read-only check. `--skip-tests` is intended only after the same source has passed CI. PostgreSQL and browser suites run in CI independently.

This script updates existing resources. It does not attach billing, create a SQL instance, grant new project roles, delete databases, or accept third-party terms. Deployment requires the operator's existing cloud permissions. It sets the service to public invocation because application authentication is handled by Rill.

## Resource layout

| Resource             | Configuration                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Firebase project     | `gen-lang-client-0444960702`                                                                    |
| Hosting site         | `rill-streams`                                                                                  |
| Cloud Run service    | `rill-api`, `us-central1`, 512 MiB, one vCPU, 0 to 2 instances, concurrency 20                  |
| Container repository | `us-central1-docker.pkg.dev/gen-lang-client-0444960702/rill/api`                                |
| SQL instance         | `rill-postgres`, PostgreSQL 15, `db-f1-micro`, zonal, 10 GB SSD with a 20 GB growth cap         |
| Database and owner   | `rill`, `rill_app`                                                                              |
| Runtime identity     | `rill-runtime`, Cloud SQL Client and access to the Rill password secret only                    |
| Connection pool      | Three connections per instance; the database permits 25 total connections                       |
| Database credential  | `rill-db-password`, pinned Secret Manager version 1                                             |
| Backups              | Daily at 02:00 UTC, seven retained backups, point-in-time recovery enabled, deletion protection |

The Cloud SQL connector authenticates the runtime identity and encrypts its database connection. No public authorized networks were added. The runtime account has no project-wide Editor or Owner role. Its SQL identity owns only the dedicated Rill database. The initial `cloudsqlsuperuser` membership, `CREATEDB`, and `CREATEROLE` privileges were removed after the logical restore drill. A fresh connection, rolled-back DDL/trigger exercise, and normal storage initialization passed with the reduced privileges. The account retains application-schema ownership for startup migrations; separating migration and runtime identities is a further hardening step. See [the restore and privilege verification record](qa/cloudsql-restore.md).

An unused `rill-onehealth` project was also created during setup. Its billing association was blocked by the billing account's project quota; it hosts no Rill service or SQL instance. Existing unrelated projects and resources were preserved.

## Session and proxy behavior

Firebase Hosting forwards the specially named `__session` cookie. Rill sets it HttpOnly, Secure and SameSite=Lax. The exact Hosting origins are allowlisted for writes. Responses containing user data are private and not cached. Static fingerprinted assets can be cached for a year.

A Cloud Run socket peer is a managed gateway, not a verified visitor IP. Rill does not trust arbitrary forwarded-IP headers. Cloud deployments use named, persistent service-wide anonymous request budgets plus per-account and workspace controls. See [the limits and trust boundary](qa/firebase-proxy-trust.md). These limits reduce abuse but are not comprehensive bot or DDoS protection; legitimate traffic can exhaust a shared budget. Do not describe them as individual visitor limits.

## Operating cost and capacity

This deployment uses a paid, always-on Cloud SQL instance. The smallest shared-core instance and initial storage are expected to cost roughly US$10 per month before backup storage, network transfer, taxes or other usage. This is an estimate, not a fixed bill or a free-tier promise. Cloud Run scales to zero, but Cloud SQL continues billing while running. Firebase Hosting, builds and artifact storage have usage limits and may incur additional charges. Set a billing budget alert in the cloud project before opening a larger pilot. Alerts do not cap spending.

The zonal shared-core database is suitable for hackathon evaluation and a small supervised pilot. It is not a high-availability production deployment, has no Rill SLA and has not been load-tested at city scale. Broader use needs capacity measurements, a region appropriate to participants, an operational owner, restore drills, stronger identity controls and a reviewed retention policy.

## Backup, restore and rollback

Before a database change, take an on-demand Cloud SQL backup. Never restore over the live instance as a routine test. Use a separate disposable instance for a platform-level recovery drill. Point-in-time recovery requires retaining the necessary logs and is distinct from application export.

The [scoped logical restore drill](qa/cloudsql-restore.md) passed: a consistent PostgreSQL 15 snapshot restored into a new disposable database, matched all 12 tables and 61 schema definitions, and enforced the tested constraints. The disposable database was removed. The reusable script requires an authorized maintenance identity; the reduced runtime identity cannot create its target database. Never publish a database dump: it contains private account and workspace records. Platform backup restoration and point-in-time recovery remain separate, untested exercises.

To roll back the API, use Cloud Run's revision traffic controls to route traffic to a previously verified revision. A code rollback does not reverse schema changes. Firebase Hosting releases can be rolled back through its release history. Verify `/api/health`, sign-in and the complete workflow after either rollback. Keep the previous container digest and a backup associated with every release.

## Primary references

- [Firebase Hosting and Cloud Run](https://firebase.google.com/docs/hosting/cloud-run)
- [Firebase Hosting cookies and cache behavior](https://firebase.google.com/docs/hosting/manage-cache)
- [Cloud SQL backups](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups)
- [Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/sql-proxy)
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing)
