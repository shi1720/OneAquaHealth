# Deployment and operations

The repository ships three tested storage/runtime paths. A remote deployment is successful only after an actual HTTPS smoke test, not merely a build or configuration upload.

## Current handoff status

The full application runs locally at http://localhost:5173. Node SQLite, local libSQL, and local Cloudflare workerd/D1 have been exercised. Public hosting is prepared but pending the user's database account authorization; no permanent live URL is claimed here until verified.

Remote hosting requires operator account credentials and the database connection. No paid subscription has been purchased. The application source contains no hosting credentials.

## Node with persistent SQLite

```sh
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 \
APP_ORIGIN=https://your-real-hostname.example \
DATABASE_PATH=/persistent/rill.sqlite npm start
```

The host must run Node 22.13+ and terminate HTTPS. The server listens on `PORT` (8787 by default). Preserve `/persistent` across deployments. `/api/health` is suitable for a host health check. Use an operator-managed reverse proxy and configure edge request limits before a large public rollout. The API's default socket-based rate limit does not trust arbitrary forwarded IP headers.

The Dockerfile builds the actual client and serves it with the same API. Mount `/app/data` as a persistent volume. The example in the main README uses development cookies only for localhost; public deployments require production mode.

## Render free web service with remote libSQL

Render free web-service disks are ephemeral. This deployment therefore **requires remote persistence**, enforced with `REQUIRE_REMOTE_DATABASE=true`. Do not remove that guard to make an incomplete deployment appear successful.

1. Create a SQLite-compatible **libSQL** database in Turso. The newer Turso rewrite is a different database engine; this adapter does not claim compatibility with it.
2. Set `TURSO_DATABASE_URL` and a database-scoped `TURSO_AUTH_TOKEN` in Render's secret environment settings. Do not paste credentials into GitHub, screenshots, commit messages, or this document.
3. Create a web service from this repository and its `render.yaml` blueprint, or use build command `npm ci && npm run build`, start command `npm start`, and the free plan.
4. Set `NODE_ENV=production`, `HOST=0.0.0.0`, `REQUIRE_REMOTE_DATABASE=true`, the database variables, and `APP_ORIGIN` to the exact final HTTPS URL. `RENDER_EXTERNAL_URL` is the safe fallback when Render provides it.
5. The server initializes the schema on connection. Run one startup/migration at a time for the initial deployment. Set up database backups according to the provider's documented capability; test restore before live fieldwork.
6. Run the HTTP smoke script against the final origin. Check real registration, sign-in, an observation, task/recheck, exports, and persistence after a redeploy.

Free service instances may sleep when idle and take time to wake. Provider quotas and prices can change. This is suitable for evaluating the workflow within its bounds, not an availability guarantee. The proposed €149 managed service in the business brief assumes different operational responsibilities and is not a subscription configured by this repository.

## Cloudflare Workers and D1

The Worker uses the same API and engine, with a D1 adapter. There are no external inference credentials.

```sh
npm ci
npm run build
npx wrangler login
npx wrangler d1 create rill
```

Replace the local placeholder database ID in `wrangler.jsonc` with the returned database ID. A database ID is an identifier, not a secret. Keep credentials managed by Wrangler or secret environment variables.

```sh
npx wrangler d1 migrations apply rill --remote
npx wrangler deploy
```

Set `APP_ORIGIN` to the deployed HTTPS origin as a Worker variable and deploy again if needed. Verify the actual URL before using it. The assets binding serves the SPA. `/api/*` executes the Worker first. An hourly scheduled handler deletes expired demo data and sessions. Static headers in `public/_headers` apply to the asset layer.

Local runtime verification:

```sh
npx wrangler d1 migrations apply rill --local
npx wrangler dev --port 8788
RILL_SMOKE_ORIGIN=http://localhost:8788 npx tsx server/smoke.ts
```

Cloudflare's native PBKDF2 cap means this target uses 100,000 iterations, while Node uses 600,000. These are not equivalent password-hardening levels. Review managed identity before sensitive production use. Do not migrate Node hashes to a Worker that cannot verify their iteration count. Temporary unclaimed Worker deployments expire and are not appropriate as the final hackathon URL.

## Backups and recovery

For SQLite, use its online backup facility or a consistent volume snapshot. Copying only a live `.sqlite` file can miss WAL data. For libSQL/D1, follow the chosen provider's backup and restore procedures and rehearse recovery using non-production records.

The account deletion endpoint permanently removes the active workspace database records. Operator/provider backups can outlive deletion; publish that retention policy. Demonstration workspaces expire after 48 hours. Real observations do not yet have automatic retention or archive jobs.

See [backend operations](../server/README.md), [security](../SECURITY.md), and [privacy](privacy.md) for remaining controls and limits.

Sources checked 23 September 2026: [Render free services](https://render.com/docs/free), [Turso TypeScript/libSQL reference](https://docs.turso.tech/sdk/ts/reference), [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [temporary Cloudflare accounts](https://developers.cloudflare.com/workers/platform/claim-deployments/).
