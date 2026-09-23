# Backend operations and boundaries

Rill's API runs on Node 22.16+ with persistent SQLite, or on Cloudflare Workers with D1. Both use the same Hono application, Zod request validation, tenant scoping, review state machine, export mappings, and decision engine. No paid API, inference provider, or external model is needed.

## Node deployment

- `npm run build`, then `NODE_ENV=production APP_ORIGIN=https://your-host.example HOST=0.0.0.0 npm start`.
- `DATABASE_PATH` selects the SQLite database, default `./data/rill.sqlite`. Mount a persistent volume. SQLite uses WAL, foreign keys, a busy timeout, and transactional batches. Do not put it on an ephemeral filesystem.
- Terminate HTTPS at a trusted proxy. Set `APP_ORIGIN` to the public origin; it is compared exactly for all mutations. Secure cookies are enabled when `NODE_ENV=production`.
- `PORT` defaults to 8787, `HOST` to 127.0.0.1. The Node target serves the built `dist` application and hashed assets. API responses are `no-store`. The public health endpoint performs a database read and returns an error when storage is unavailable.
- The Node target deliberately uses the actual socket address, never a client-supplied forwarding header, for IP limits. A reverse proxy causes users to share its IP bucket. Configure edge throttling and a reviewed trusted-proxy strategy before high-volume public rollout.
- Back up with SQLite's online backup facility or a consistent database snapshot; do not copy only the main database while WAL writes are in flight. Restoration and disaster recovery must be exercised by an operator before a real pilot.
- Cleanup runs at startup and hourly. Expired sessions and rate-limit rows are deleted; demonstration workspaces and associated records are deleted after 48 hours.

## Cloudflare target

Use `server/worker.ts` with a D1 binding called `DB`, static asset binding called `ASSETS`, `dist` as the assets directory, and SPA fallback. Configure an hourly scheduled trigger. Set the D1 migration directory to `server/migrations`, apply its migrations before serving requests, and set `APP_ORIGIN` to the public HTTPS origin. The target uses Cloudflare's edge-provided `CF-Connecting-IP`, which Cloudflare overwrites, for IP rate limiting.

Worker-native WebCrypto PBKDF2 derivations have a 100,000-iteration production cap. The Worker target therefore explicitly uses 100,000 SHA-256 iterations; Node uses 600,000. This is a real deployment tradeoff, not equivalent password-hardening strength. Use the Node target or a reviewed managed identity provider before handling sensitive data. Database passwords hashed with the Node target's 600,000 iterations must not simply be migrated to a Worker runtime that cannot verify them.

Local workerd + D1 were exercised through the complete API lifecycle, including real password registration and verification. This is local runtime validation, not a claim of successful remote deployment.

## Authentication and permissions

Passwords use PBKDF2-SHA256 with unique 128-bit random salts and bounded password lengths. A session is a random 256-bit token; only its SHA-256 digest is stored. Cookies are HttpOnly, SameSite=Lax, path `/`, and Secure in production. Sessions expire after seven days (one day for demo accounts). Registration and login rotate the requesting browser's previous session.

Coordinators manage sites, members, review transitions, dispatch, exports, and workspace deletion. Volunteers submit observations, inspect their workspace, preview plans, and update tasks assigned to their stable user ID. An assigned display name is not an authorization token. The coordinator creates volunteer accounts directly; there is no claim that invitation emails were sent. Password change verifies the current password, rotates the browser session, and revokes all earlier sessions. No email verification, MFA or SSO is implemented.

Real registration returns a one-time-visible 256-bit offline recovery key. `POST /api/auth/recover` takes `email`, `recoveryKey` and `newPassword`. A successful atomic transaction consumes and replaces the key, updates the password, revokes all previous sessions and opens a new session. A compare-and-swap hash guard permits only one concurrent use. `POST /api/auth/recovery-key` requires an authenticated real account and `currentPassword`; it enrolls an existing account or invalidates and replaces its earlier key. Both issuance routes return the new secret only once; profile/workspace/export responses never contain it. API responses use `no-store`.

Only a domain-separated SHA-256 key digest is stored. Recovery is limited to eight attempts per IP and six per normalized email per 15 minutes, in addition to the shared auth limit; authenticated issuance allows six attempts per user per 15 minutes. Unknown accounts and incorrect, malformed, demo, replaced or used keys receive the same verification failure. Email identity is not verified and no email is sent. Losing both passphrase and saved key leaves no self-service recovery path. A manually created volunteer must generate their own key from settings after receiving their initial credentials. Apply D1 migrations `0002_recovery_keys.sql` and `0003_security_events.sql` before serving the updated application; Node/libSQL initialize these additive tables automatically.

Account recovery, key replacement and password change record their outcome in a separate `security_events` table in the same transaction. It retains the latest 100 events per current account; older security events expire on the next security action, and account deletion cascades through its events. The JSON export includes retained `securityEvents` and explicit `securityEventRetention` metadata. This declared rolling policy keeps security actions available when the ordinary 10,000-event audit allowance is full; ordinary decision audits are never pruned by authentication.

All mutating endpoints require JSON and an exact matching Origin; cross-site fetch metadata is rejected. Auth requests are throttled by hashed IP, login by hashed email, and authenticated reads/writes by user. No raw IPs are stored. Limits are persisted in SQLite/D1. These controls reduce abuse but are not a substitute for edge DDoS protection, security review, or identity verification.

## Records and evidence

A real workspace begins empty. A coordinator adds its actual monitoring sites. The demo creates six fictional Coimbra-area sites and eight synthetic observations in an independent workspace. Demo labels follow every report and export. Site access, exposure context, and visit-time estimates are supplied by the coordinator and are not geographically verified.

- Observation retry keys are unique per workspace and author. Concurrent retries create one report.
- Review order is `new → reviewed → actioned → resolved`. Every transition requires a human note and a matching revision. Conflicting edits produce HTTP 409.
- Resolution requires a completed `recheck` task containing a meaningful textual result, recorded after the action. This is an accountable human evidence record, not an automated determination that conditions are safe.
- A database index permits at most one open task per site. Plan commit runs in an atomic batch; concurrent plans cannot dispatch duplicate visits.
- Fish mortality prompts immediate local-authority referral. Fish mortality, fast flow, unusual odour, and restricted/sensitive sites are excluded from volunteer plans and direct volunteer task creation. A coordinator may record an administrative recheck of authority/qualified advice; it is not a volunteer visit. If a new hazardous report arrives at an assigned site, volunteers cannot start or complete its tasks until coordinator review.
- Sampling and cleanup coordination tasks may only be assigned to a coordinator, who must arrange qualified staff and local procedures. The labels do not grant training, permission, or competence; Rill performs no laboratory analysis and issues no bathing or drinking advice.

The engine is a versioned, deterministic heuristic. It separates operational follow-up priority from the evidence tier. Matching reports count distinct accounts at the same site within 48 hours; real-world independence and identity are not established. Its weights and thresholds have not been calibrated against field outcomes. A clear-water observation does not create urgency or establish safety. The field plan solves a 0/1 knapsack exactly over unique eligible sites; the sum of independent visit estimates is not a route optimization or a measured productivity improvement.

## Resource bounds and photos

Workspaces are capped at 100 sites, 2,000 observations, 2,000 tasks, 50 members, 10,000 retained audit events, and 50 MB of encoded photos. Database triggers enforce quotas during concurrent writes. Dashboard activity responses contain the latest 100 events; JSON exports include the complete retained audit trail, including human actor names and the priority/evidence/engine snapshot attached to every review transition. Audit events are not silently truncated in the export. These are deliberate pilot bounds; a larger rollout needs pagination, retention policy, object storage, and capacity planning.

Photo input accepts a `data:image/jpeg|png|webp;base64,...` payload of at most 1 MB decoded and validates content signatures. The API stores it separately from dashboard records and serves it from an authenticated, tenant-scoped `/api/observations/:id/photo` endpoint. This prevents repeated inline photo blobs in every workspace response. It does not perform antivirus scanning or full semantic image validation. The application compresses/re-encodes browser uploads; operators should still instruct users to avoid faces, private information, and sensitive wildlife details.

JSON/CSV/GeoJSON/FHIR exports exclude photo blobs and authentication data. JSON includes the complete audit trail; CSV and GeoJSON are narrower projections of observations and monitoring sites, and experimental FHIR carries submission provenance plus operational tasks. CSV fields are quoted and formula-leading characters are neutralized. Exports may contain observation notes, task assignee names, and audit actor names; coordinators must review before sharing. Workspace deletion requires the coordinator's password, except in demo mode, and cascades through all related database records.

## FHIR boundaries

The exporter creates an experimental base R4 `Bundle` of type `collection` with `Organization`, `Location`, `Observation`, `Provenance`, and `Task` resources. Environmental observations reference Locations and never Patients. Links resolve within the bundle; author identifiers are pseudonymous. The reserved `rill.example` namespace does not imply a live FHIR endpoint.

The base R4 specification explicitly permits a Location as an Observation subject. Provenance records original submission authorship; the JSON export additionally carries the operational review audit. No OneAquaHealth profile is asserted in `meta.profile`; no validation against the draft implementation guide, production receiving system, national terminology, or jurisdictional requirements is claimed. A successful JSON parse and structural tests are not formal FHIR conformance certification.

Primary references: [FHIR R4 Observation](https://hl7.org/fhir/R4/observation.html), [FHIR R4 Provenance](https://hl7.org/fhir/R4/provenance.html), [FHIR R4 Task](https://hl7.org/fhir/R4/task.html), [OneAquaHealth draft guide](https://build.fhir.org/ig/hl7-eu/oah/), [Cloudflare Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).

## Verification

`tests/recovery.test.ts` adds 20 regression checks across native Node SQLite and the actual local libSQL SDK: hashed-only storage, one-time use, concurrent reset, stale-login rejection, session revocation, full-business-audit-quota recovery, bounded security-event retention, current-password confirmation, legacy-account enrollment, uniform failures, throttling, deletion and rollback on a transaction failure. Native local workerd/D1 was also exercised for concurrent recovery, key rotation, earlier-session revocation and cleanup. These are local runtime checks, not remote recovery or disaster-restore validation.

`npm test` includes 41 backend/engine tests covering authentication, tenant boundaries, role checks, CSRF, validation, photo access, race conditions, idempotency, review revisions, chronological recheck gates, safe planning, exact optimization compared with exhaustive enumeration, data export, deletion, and demo retention.

`RILL_SMOKE_ORIGIN=http://localhost:8787 npx tsx server/smoke.ts` exercises a running target through demo creation, sessions, review/action, a blocked premature resolution, recheck completion, resolution, plan, commit, FHIR export, real registration/login, and deletion. It creates disposable test workspaces and deletes them. It has been run against both actual Node SQLite and local Cloudflare workerd D1.

## Import and operational management

`POST /api/import` accepts `{observations: ObservationInput[], sourceDemo?: boolean}` with at most 100 rows; an optional row-level `demo` flag is also accepted for source-label validation. Import requires a coordinator. All rows are schema/date/site validated before one atomic database batch; the database enforces quotas. Retry keys are retained, duplicate keys within the file are rejected, and previously imported keys are skipped. Site IDs must already exist in the receiving workspace. Photo data, original author identities, and source review status are not imported: the importing coordinator becomes the accountable author and every imported report starts `new`. The response is `{imported, skipped, observations}`. This avoids treating imported claims of multiple authors as verified independent accounts. Known synthetic sources or rows are rejected in real workspaces; imports into demo workspaces remain synthetic regardless of input flags. The file parser must forward source demo metadata and preserve retry identifiers.

`PATCH /api/sites/:id` validates the full site-edit body and retains `id`/`lastCheckedAt`; its audit records before/after context. `DELETE /api/tasks/:id` cancels only open tasks and retains a complete human-readable summary of the former task in an attributed, observation-linked audit event. Completed task evidence cannot be cancelled. `DELETE /api/members/:id` revokes volunteer access and sessions while retaining authored evidence; an account with open tasks cannot be removed, and coordinators cannot remove themselves through this endpoint. `POST /api/auth/password` takes `currentPassword` and `newPassword`; it is available to real accounts and invalidates all existing sessions before opening a new one for the requesting browser.

## Optional live site directory

`GET /api/catalog/oneaquahealth` is a coordinator-only, read-only adapter for the fixed [OneAquaHealth site directory](https://api.enora-oah.eu/api/sites/all). It returns `{source, retrievedAt, sites:[{code,name,city,lat,lng}], notice}`. The adapter caches successful results for ten minutes, uses a five-second timeout, prohibits upstream redirects, validates coordinates, and caps the response at 1 MB/2,000 source records. Polygons and environmental assessment fields are discarded. An upstream failure produces HTTP 503 with no fictional fallback. A coordinator must confirm access, habitat, context, and permissions before saving an external directory entry as a local site; directory inclusion is neither permission nor an endorsement. The decision engine does not use directory assessment results. No static source dataset is redistributed with the application.

## Optional durable libSQL hosting

The Node target can use an external SQLite-compatible libSQL database by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. `LibSQLStorage` initializes the idempotent schema and uses the SDK's atomic write batches. The same 41 backend/engine tests pass with `RILL_TEST_STORAGE=libsql npx vitest run tests/backend.test.ts tests/engine.test.ts` against the actual local `@libsql/client` file runtime. This verifies SDK/SQL compatibility, not remote credentials, geography, backup configuration, or cloud durability. Choose a **libSQL** database: current Turso documentation distinguishes the newer Turso engine from libSQL, and this application depends on SQLite-compatible triggers and JSON functions.

The root `render.yaml` configures a free Node service backed by the external database, with secrets supplied in Render's environment UI. It sets `REQUIRE_REMOTE_DATABASE=true`, which makes startup fail clearly if a remote URL is absent instead of silently putting real workspace data on Render's ephemeral disk. For a separate deployment using a genuine persistent local volume, omit that flag and use `DATABASE_PATH`. On Render, Node uses `RENDER_EXTERNAL_URL` as the Origin fallback and listens on `0.0.0.0`; an explicit `APP_ORIGIN` still takes precedence. Node retains its 600,000-iteration password hashing when using libSQL.
