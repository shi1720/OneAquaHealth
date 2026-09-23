import { createApp, pruneExpiredData } from './app';
import { D1Storage, type D1Like } from './storage';

interface WorkerEnvironment {
  DB: D1Like;
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_ORIGIN?: string;
}
interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}
export default {
  async fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const storage = new D1Storage(env.DB);
      // Workers WebCrypto caps PBKDF2 at 100k per derivation; this is below the Node deployment's 600k.
      // For sensitive deployments use the Node target or a reviewed managed identity provider.
      const app = createApp(storage, {
        production: url.protocol === 'https:',
        origin: env.APP_ORIGIN || url.origin,
        passwordIterations: 100_000,
        clientIP: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
      });
      return app.fetch(request);
    }
    const response = await env.ASSETS.fetch(request);
    const secured = new Response(response.body, response);
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    secured.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    if (url.protocol === 'https:')
      secured.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    return secured;
  },
  async scheduled(_event: unknown, env: WorkerEnvironment, context: ExecutionContextLike) {
    context.waitUntil(pruneExpiredData(new D1Storage(env.DB)));
  },
};
