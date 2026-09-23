import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createApp, pruneExpiredData } from './app';
import { SQLiteStorage } from './sqlite';
import { LibSQLStorage } from './libsql';
import { PostgresStorage } from './postgres';
import { aggregateRateLimitsFromEnv } from './rate-config';

const postgres = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
const cloudRun = Boolean(process.env.K_SERVICE);
const aggregateRateLimits = cloudRun ? aggregateRateLimitsFromEnv(process.env) : undefined;
if (
  (process.env.REQUIRE_REMOTE_DATABASE === 'true' || cloudRun) &&
  !postgres &&
  !/^(libsql|https):\/\//.test(process.env.TURSO_DATABASE_URL || '')
) {
  throw new Error(
    'A durable remote database is required. Configure PostgreSQL or remote libSQL before starting this deployment.',
  );
}
if (process.env.DATABASE_URL && !/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL))
  throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
if (cloudRun && !process.env.APP_ORIGIN)
  throw new Error('APP_ORIGIN must be the exact public HTTPS application origin on Cloud Run.');
if (cloudRun && new URL(process.env.APP_ORIGIN!).protocol !== 'https:')
  throw new Error('Cloud Run APP_ORIGIN must use HTTPS.');
const sessionCookieName =
  process.env.SESSION_COOKIE_NAME || (cloudRun ? '__session' : 'rill_session');
if (sessionCookieName !== '__session' && sessionCookieName !== 'rill_session')
  throw new Error('SESSION_COOKIE_NAME must be __session or rill_session.');
const storage = postgres
  ? await PostgresStorage.connect(process.env.DATABASE_URL, {
      max: Number(process.env.PGPOOL_MAX || 5),
    })
  : process.env.TURSO_DATABASE_URL
    ? await LibSQLStorage.connect(process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN)
    : new SQLiteStorage();
const production = process.env.NODE_ENV === 'production';
const app = createApp(storage, {
  production,
  origin: process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || undefined,
  allowedOrigins: process.env.APP_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  sessionCookieName,
  aggregateRateLimits,
  clientIP: (c) => getConnInfo(c).remote.address ?? 'unknown',
});
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (production) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
  }
  await next();
});
app.use(
  '/assets/*',
  serveStatic({
    root: './dist',
    onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable'),
  }),
);
app.get(
  '*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => (path.includes('.') ? path : '/index.html'),
  }),
);
await pruneExpiredData(storage);
const maintenance = setInterval(() => {
  void pruneExpiredData(storage).catch((error) => console.error('Scheduled cleanup failed', error));
}, 60 * 60_000);
maintenance.unref();
const port = Number(process.env.PORT || 8787);
const hostname = process.env.HOST || (process.env.RENDER || cloudRun ? '0.0.0.0' : '127.0.0.1');
const server = serve({ fetch: app.fetch, port, hostname }, (info) =>
  console.log(
    `Rill API${production ? ' + application' : ''} listening on http://${hostname}:${info.port}`,
  ),
);
if ('requestTimeout' in server) server.requestTimeout = 30_000;
if ('headersTimeout' in server) server.headersTimeout = 15_000;
const stop = () => {
  clearInterval(maintenance);
  server.close(() => {
    void Promise.resolve(storage.close()).then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
