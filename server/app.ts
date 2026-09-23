import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type {
  Assessment,
  AuditEvent,
  FieldTask,
  Observation,
  Site,
  User,
  WorkspaceData,
} from '../shared/types';
import {
  assessObservation,
  buildFieldPlan,
  ENGINE_VERSION,
  unsafeForVolunteer,
} from '../shared/engine';
import { seedScenario } from '../shared/seed';
import type { SQLStatement, Storage } from './storage';
import {
  DUMMY_HASH,
  hashPassword,
  randomToken,
  sha256,
  validPhoto,
  verifyPassword,
} from './security';
import { loadOneAquaHealthCatalog, type SiteCatalog } from './catalog';
import { exportCSV, exportFHIR, exportGeoJSON, exportJSON } from './export';

type UserRow = {
  id: string;
  workspace_id: string;
  email: string;
  name: string;
  role: User['role'];
  password_hash: string | null;
  workspace_name: string;
  is_demo: number;
  scenario_date: string | null;
};
type AppEnvironment = { Variables: { user: User; userRow: UserRow } };
export interface AppOptions {
  production?: boolean;
  origin?: string;
  now?: () => Date;
  /** Must come from trusted runtime connection information, never arbitrary forwarding headers. */ clientIP?: (
    c: Context,
  ) => string;
  passwordIterations?: number;
  catalogLoader?: () => Promise<SiteCatalog>;
}
const SESSION_COOKIE = 'rill_session';
const SESSION_MS = 7 * 24 * 3_600_000;
const MAX_OBSERVATIONS = 2_000;
const MAX_SITES = 100;
const MAX_TASKS = 2_000;
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const email = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const password = z.string().min(12, 'Use a password of at least 12 characters.').max(128);
const datetime = z.iso.datetime({ offset: true });
const registerSchema = z
  .object({ name: text(2, 80), email, password, workspaceName: text(2, 100) })
  .strict();
const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
const memberSchema = z.object({ name: text(2, 80), email, password }).strict();
const observationSchema = z
  .object({
    siteId: text(1, 80),
    observedAt: datetime,
    concerns: z
      .array(
        z.enum([
          'foam',
          'discoloration',
          'litter',
          'odour',
          'dead_fish',
          'algae',
          'erosion',
          'wildlife',
          'clear',
        ]),
      )
      .min(1)
      .max(9)
      .refine((items) => new Set(items).size === items.length, 'Select each concern once.')
      .refine(
        (items) =>
          !items.includes('clear') ||
          items.every((item) => item === 'clear' || item === 'wildlife'),
        'No visible concern cannot be combined with a concern.',
      ),
    clarity: z.enum(['clear', 'cloudy', 'opaque', 'unsure']),
    flow: z.enum(['still', 'slow', 'steady', 'fast', 'unsure']),
    confidence: z.enum(['unsure', 'fairly_sure', 'certain']),
    notes: text(8, 2_000),
    photo: z
      .string()
      .max(1_400_000)
      .refine(validPhoto, 'Photo must be a valid JPEG, PNG, or WebP image up to 1 MB.')
      .nullable()
      .optional(),
    clientId: text(8, 100).regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();
const importObservationSchema = observationSchema.extend({
  photo: z.null().optional(),
  demo: z.boolean().optional(),
});
const importSchema = z
  .object({
    observations: z
      .array(importObservationSchema)
      .min(1)
      .max(100)
      .refine(
        (rows) => new Set(rows.map((row) => row.clientId)).size === rows.length,
        'Import retry identifiers must be unique within the file.',
      ),
    sourceDemo: z.boolean().optional(),
  })
  .strict();
const reviewSchema = z
  .object({
    status: z.enum(['reviewed', 'actioned', 'resolved']),
    note: text(8, 2_000),
    revision: z.number().int().min(1),
  })
  .strict();
const taskSchema = z
  .object({
    observationId: text(1, 80),
    title: text(5, 140),
    kind: z.enum(['verify', 'sample', 'cleanup', 'recheck']),
    assignedTo: text(2, 80),
    dueAt: datetime,
    estimatedMinutes: z.number().int().min(5).max(480),
  })
  .strict();
const taskUpdateSchema = z
  .object({ status: z.enum(['in_progress', 'completed']), result: text(12, 2_000).optional() })
  .strict()
  .refine(
    (value) => value.status !== 'completed' || Boolean(value.result),
    'Record at least 12 characters of field evidence before completing the task.',
  );
const budgetSchema = z.object({ budgetMinutes: z.number().int().min(20).max(480) }).strict();
const siteSchema = z
  .object({
    name: text(2, 100),
    catchment: text(2, 100),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    description: text(8, 500),
    habitat: text(2, 100),
    access: text(12, 500),
    exposure: z.number().int().min(0).max(5),
    walkMinutes: z.number().int().min(5).max(240),
    sensitive: z.boolean(),
  })
  .strict();
function safeUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    isDemo: Boolean(row.is_demo),
  };
}
function fail(status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429, message: string): never {
  throw new HTTPException(status, { message });
}
async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json'))
    fail(400, 'Send JSON with Content-Type: application/json.');
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    fail(400, 'The request contains invalid JSON.');
  }
  const result = schema.safeParse(value);
  if (!result.success)
    fail(
      422,
      result.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'Request'}: ${issue.message}`)
        .join(' '),
    );
  return result.data;
}
function jsonStatement(
  table: 'sites' | 'observations' | 'tasks',
  id: string,
  workspaceId: string,
  payload: unknown,
  extra?:
    | { authorId: string; clientId: string; createdAt: string }
    | { observationId: string; siteId: string; status: string; assignedUserId?: string },
): SQLStatement {
  if (table === 'observations' && extra && 'authorId' in extra)
    return {
      sql: 'INSERT INTO observations(id,workspace_id,author_id,client_id,payload,created_at) VALUES(?,?,?,?,?,?)',
      params: [
        id,
        workspaceId,
        extra.authorId,
        extra.clientId,
        JSON.stringify(payload),
        extra.createdAt,
      ],
    };
  if (table === 'tasks' && extra && 'observationId' in extra)
    return {
      sql: 'INSERT INTO tasks(id,workspace_id,observation_id,site_id,assigned_user_id,status,payload) VALUES(?,?,?,?,?,?,?)',
      params: [
        id,
        workspaceId,
        extra.observationId,
        extra.siteId,
        extra.assignedUserId ?? null,
        extra.status,
        JSON.stringify(payload),
      ],
    };
  return {
    sql: 'INSERT INTO sites(id,workspace_id,payload) VALUES(?,?,?)',
    params: [id, workspaceId, JSON.stringify(payload)],
  };
}
type DecisionSnapshot = Pick<Assessment, 'score' | 'priority' | 'evidence' | 'reasons'> & {
  engineVersion: string;
  assessedAt: string;
};
function auditStatement(
  workspaceId: string,
  actorName: string,
  entityId: string,
  action: string,
  detail: string,
  now: string,
  onlyAfterChange = false,
  decision?: DecisionSnapshot,
  observationId?: string,
): SQLStatement {
  const event: AuditEvent & { decision?: DecisionSnapshot; observationId?: string } = {
    id: crypto.randomUUID(),
    actorName,
    entityId,
    action,
    detail,
    createdAt: now,
    ...(decision ? { decision } : {}),
    ...(observationId ? { observationId } : {}),
  };
  return {
    sql: `INSERT INTO audits(id,workspace_id,payload,created_at) SELECT ?,?,?,?${onlyAfterChange ? ' WHERE changes() = 1' : ''}`,
    params: [event.id, workspaceId, JSON.stringify(event), now],
  };
}
const USER_SELECT =
  'SELECT u.*, w.name AS workspace_name, w.is_demo, w.scenario_date FROM users u JOIN workspaces w ON w.id=u.workspace_id';
export function createApp(storage: Storage, options: AppOptions = {}) {
  const app = new Hono<AppEnvironment>();
  const now = options.now ?? (() => new Date());
  const timestamp = () => now().toISOString();
  const passwordIterations = options.passwordIterations ?? 600_000;
  const secure = options.production ?? false;
  const coordinator = (c: Context<AppEnvironment>) => {
    if (c.get('user').role !== 'coordinator')
      fail(403, 'Only a workspace coordinator can do that.');
  };
  const readRecords = async <T>(
    table: 'sites' | 'observations' | 'tasks' | 'audits',
    workspaceId: string,
    limit: number,
  ): Promise<T[]> =>
    (
      await storage.all<{ payload: string }>(
        `SELECT payload FROM ${table} WHERE workspace_id=?${table === 'observations' || table === 'audits' ? ' ORDER BY created_at DESC' : ''} LIMIT ?`,
        [workspaceId, limit],
      )
    ).map((row) => JSON.parse(row.payload) as T);
  const readOne = async <T>(
    table: 'observations' | 'tasks' | 'sites',
    id: string,
    workspaceId: string,
  ): Promise<T> => {
    const row = await storage.get<{ payload: string }>(
      `SELECT payload FROM ${table} WHERE workspace_id=? AND id=?`,
      [workspaceId, id],
    );
    if (!row) fail(404, 'That record was not found in your workspace.');
    return JSON.parse(row.payload) as T;
  };
  const workspace = async (
    user: User,
    scenarioDate: string | null,
    fullAudit = false,
  ): Promise<WorkspaceData> => {
    const [sites, observations, tasks, activity] = await Promise.all([
      readRecords<Site>('sites', user.workspaceId, MAX_SITES),
      readRecords<Observation>('observations', user.workspaceId, MAX_OBSERVATIONS),
      storage
        .all<{ payload: string; assigned_user_id: string | null }>(
          'SELECT payload,assigned_user_id FROM tasks WHERE workspace_id=? LIMIT ?',
          [user.workspaceId, MAX_TASKS],
        )
        .then((rows) =>
          rows.map((row) => ({
            ...(JSON.parse(row.payload) as FieldTask),
            ...(!fullAudit
              ? { canUpdate: user.role === 'coordinator' || row.assigned_user_id === user.id }
              : {}),
          })),
        ),
      fullAudit
        ? storage
            .all<{ payload: string }>(
              'SELECT payload FROM audits WHERE workspace_id=? ORDER BY created_at DESC',
              [user.workspaceId],
            )
            .then((rows) => rows.map((row) => JSON.parse(row.payload) as AuditEvent))
        : readRecords<AuditEvent>('audits', user.workspaceId, 100),
    ]);
    const siteMap = new Map(sites.map((site) => [site.id, site]));
    return {
      user,
      sites,
      observations,
      tasks,
      activity,
      assessments: observations
        .filter((observation) => siteMap.has(observation.siteId))
        .map((observation) =>
          assessObservation(observation, siteMap.get(observation.siteId)!, observations, now()),
        ),
      engineVersion: ENGINE_VERSION,
      scenarioDate,
    };
  };
  const limit = async (key: string, maximum: number, durationMs: number) => {
    const time = now().getTime();
    await storage.run(
      'INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN reset_at<=? THEN 1 ELSE hits+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END',
      [key, time + durationMs, time, time, time + durationMs],
    );
    const row = await storage.get<{ hits: number }>('SELECT hits FROM rate_limits WHERE key=?', [
      key,
    ]);
    if ((row?.hits ?? 0) > maximum) fail(429, 'Too many requests. Please try again later.');
  };
  const openSession = async (c: Context, userId: string, demo: boolean) => {
    const token = randomToken();
    const expires = new Date(now().getTime() + (demo ? 24 * 3_600_000 : SESSION_MS));
    const prior = getCookie(c, SESSION_COOKIE);
    if (prior) await storage.run('DELETE FROM sessions WHERE token_hash=?', [await sha256(prior)]);
    await storage.run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [
      await sha256(token),
      userId,
      expires.toISOString(),
    ]);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      path: '/',
      expires,
    });
  };
  // Every dynamic response is private. Do not permit shared caches to retain workspace data.
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'DENY');
    if (secure) c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('origin');
      const expected = options.origin ?? new URL(c.req.url).origin;
      if (!origin || origin !== expected || c.req.header('sec-fetch-site') === 'cross-site')
        fail(403, 'This action must be submitted from the Rill application on the same origin.');
      // Count actual bytes even if Content-Length is absent, malformed, or deliberately understated.
      if (Number(c.req.header('content-length') || 0) > 1_450_000)
        fail(413, 'The request is too large. Photos must be at most 1 MB.');
      const raw = c.req.raw;
      if (raw.body) {
        const reader = raw.body.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 1_450_000) {
            await reader.cancel();
            fail(413, 'The request is too large. Photos must be at most 1 MB.');
          }
          chunks.push(part.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        c.req.raw = new Request(raw, { body: bytes });
      }
    }
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    if (/rill_assignment_not_found|rill_member_has_open_tasks/.test(String(error)))
      return c.json(
        {
          error:
            'This member or their tasks changed during the request. Refresh, and complete or cancel open tasks before removing access.',
        },
        409,
      );
    if (/rill_quota_exceeded/.test(String(error)))
      return c.json(
        {
          error:
            'This workspace has reached a storage or record limit. Export your data and contact the coordinator.',
        },
        409,
      );
    console.error('Rill request failed', {
      path: c.req.path,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.json(
      {
        error:
          'The request could not be completed. Please retry; if the problem persists, contact the workspace coordinator.',
      },
      500,
    );
  });
  app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0', storage: storage.kind }));
  app.use('/api/auth/*', async (c, next) => {
    if (c.req.method === 'POST') {
      const ip = options.clientIP?.(c) ?? 'local';
      await limit(`auth:${await sha256(ip)}`, 40, 15 * 60_000);
    }
    await next();
  });
  app.post('/api/auth/demo', async (c) => {
    await body(c, z.object({}).strict());
    await limit(`demo:${await sha256(options.clientIP?.(c) ?? 'local')}`, 20, 60 * 60_000);
    const userId = crypto.randomUUID(),
      workspaceId = crypto.randomUUID(),
      time = timestamp();
    const seeded = seedScenario(now());
    const user: User = {
      id: userId,
      name: 'Shivam Gupta',
      email: `demo-${userId}@example.invalid`,
      role: 'coordinator',
      workspaceId,
      workspaceName: 'Coimbra field team · demo',
      isDemo: true,
    };
    await storage.batch([
      {
        sql: 'INSERT INTO workspaces(id,name,is_demo,scenario_date,created_at) VALUES(?,?,1,?,?)',
        params: [workspaceId, user.workspaceName, seeded.scenarioDate, time],
      },
      {
        sql: 'INSERT INTO users(id,workspace_id,email,name,role,password_hash,created_at) VALUES(?,?,?,?,?,NULL,?)',
        params: [userId, workspaceId, user.email, user.name, user.role, time],
      },
      ...seeded.sites.map((site) => jsonStatement('sites', site.id, workspaceId, site)),
      ...seeded.observations.map((observation) =>
        jsonStatement('observations', observation.id, workspaceId, observation, {
          authorId: observation.authorId,
          clientId: observation.id,
          createdAt: observation.createdAt,
        }),
      ),
      auditStatement(
        workspaceId,
        user.name,
        workspaceId,
        'Demo workspace created',
        'Isolated synthetic scenario. Sites, people, reports, and access estimates are fictional.',
        time,
      ),
    ]);
    await openSession(c, userId, true);
    return c.json({ user }, 201);
  });
  app.post('/api/auth/register', async (c) => {
    const input = await body(c, registerSchema);
    if (await storage.get('SELECT id FROM users WHERE email=?', [input.email]))
      fail(409, 'An account already uses that email. Sign in instead.');
    const userId = crypto.randomUUID(),
      workspaceId = crypto.randomUUID(),
      time = timestamp();
    const user: User = {
      id: userId,
      name: input.name,
      email: input.email,
      role: 'coordinator',
      workspaceId,
      workspaceName: input.workspaceName,
      isDemo: false,
    };
    const encoded = await hashPassword(input.password, passwordIterations);
    try {
      await storage.batch([
        {
          sql: 'INSERT INTO workspaces(id,name,is_demo,created_at) VALUES(?,?,0,?)',
          params: [workspaceId, user.workspaceName, time],
        },
        {
          sql: 'INSERT INTO users(id,workspace_id,email,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?,?)',
          params: [userId, workspaceId, input.email, input.name, 'coordinator', encoded, time],
        },
        auditStatement(
          workspaceId,
          input.name,
          workspaceId,
          'Workspace created',
          'Real workspace created without synthetic observations. Add verified local sites before reporting.',
          time,
        ),
      ]);
    } catch (error) {
      if (String(error).includes('UNIQUE'))
        fail(409, 'An account already uses that email. Sign in instead.');
      throw error;
    }
    await openSession(c, userId, false);
    return c.json({ user }, 201);
  });
  app.post('/api/auth/login', async (c) => {
    const input = await body(c, loginSchema);
    await limit(`login:${await sha256(input.email)}`, 12, 15 * 60_000);
    const row = await storage.get<UserRow>(`${USER_SELECT} WHERE u.email=?`, [input.email]);
    const dummy = DUMMY_HASH.replace('$600000$', `$${passwordIterations}$`);
    const valid = await verifyPassword(input.password, row?.password_hash ?? dummy);
    if (!row || !row.password_hash || !valid) fail(401, 'Email or password is incorrect.');
    await openSession(c, row.id, Boolean(row.is_demo));
    return c.json({ user: safeUser(row) });
  });
  app.post('/api/auth/logout', async (c) => {
    await body(c, z.object({}).strict());
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await storage.run('DELETE FROM sessions WHERE token_hash=?', [await sha256(token)]);
    deleteCookie(c, SESSION_COOKIE, { path: '/', secure, httpOnly: true, sameSite: 'Lax' });
    return c.json({ ok: true });
  });
  app.use('/api/*', async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) fail(401, 'Please sign in to your workspace.');
    const row = await storage.get<UserRow>(
      `${USER_SELECT} JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`,
      [await sha256(token), timestamp()],
    );
    if (!row) fail(401, 'Your session has expired. Please sign in again.');
    c.set('user', safeUser(row));
    c.set('userRow', row);
    if (c.req.method !== 'GET') await limit(`write:${row.id}`, 120, 60_000);
    else await limit(`read:${row.id}`, 300, 60_000);
    await next();
  });
  app.get('/api/auth/me', (c) => c.json({ user: c.get('user') }));
  app.get('/api/workspace', async (c) =>
    c.json(await workspace(c.get('user'), c.get('userRow').scenario_date)),
  );
  app.post('/api/auth/password', async (c) => {
    const input = await body(
      c,
      z
        .object({ currentPassword: z.string().min(1).max(128), newPassword: password })
        .strict()
        .refine(
          (value) => value.currentPassword !== value.newPassword,
          'Choose a new password that differs from your current password.',
        ),
    );
    const row = c.get('userRow'),
      user = c.get('user');
    if (user.isDemo || !row.password_hash)
      fail(
        422,
        'Demo accounts have no password. Create a real workspace to use account security settings.',
      );
    if (!(await verifyPassword(input.currentPassword, row.password_hash)))
      fail(403, 'Your current password is incorrect.');
    const encoded = await hashPassword(input.newPassword, passwordIterations);
    const results = await storage.batch([
      {
        sql: 'UPDATE users SET password_hash=? WHERE id=? AND workspace_id=? AND password_hash=?',
        params: [encoded, user.id, user.workspaceId, row.password_hash],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        user.id,
        'Password changed',
        'All previous sessions invalidated; the requesting browser receives a new session.',
        timestamp(),
        true,
      ),
      {
        sql: 'DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)',
        params: [user.id, user.id, encoded],
      },
    ]);
    if (!results[0].changes)
      fail(
        409,
        'Your account changed while this request was processed. Sign in again before changing the password.',
      );
    await openSession(c, user.id, false);
    return c.json({ ok: true });
  });
  app.get('/api/catalog/oneaquahealth', async (c) => {
    coordinator(c);
    try {
      return c.json(await (options.catalogLoader ?? loadOneAquaHealthCatalog)());
    } catch (error) {
      console.error(
        'OneAquaHealth catalog unavailable',
        error instanceof Error ? error.message : 'upstream error',
      );
      return c.json(
        {
          error:
            'The live OneAquaHealth site directory is unavailable. No substitute data was used. Try again later or add a verified local site manually.',
        },
        503,
      );
    }
  });
  app.post('/api/sites', async (c) => {
    coordinator(c);
    const input = await body(c, siteSchema),
      user = c.get('user');
    const count = await storage.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sites WHERE workspace_id=?',
      [user.workspaceId],
    );
    if ((count?.count ?? 0) >= MAX_SITES)
      fail(409, 'This workspace has reached its 100-site limit.');
    const site: Site = { id: crypto.randomUUID(), ...input, lastCheckedAt: null };
    await storage.batch([
      jsonStatement('sites', site.id, user.workspaceId, site),
      auditStatement(
        user.workspaceId,
        user.name,
        site.id,
        'Monitoring site added',
        `${site.name}. Access and context supplied by the coordinator; not independently verified.`,
        timestamp(),
      ),
    ]);
    return c.json({ site }, 201);
  });
  app.patch('/api/sites/:id', async (c) => {
    coordinator(c);
    const input = await body(c, siteSchema),
      user = c.get('user');
    const prior = await readOne<Site>('sites', c.req.param('id'), user.workspaceId);
    const site: Site = { ...prior, ...input, id: prior.id, lastCheckedAt: prior.lastCheckedAt };
    await storage.batch([
      {
        sql: 'UPDATE sites SET payload=? WHERE workspace_id=? AND id=?',
        params: [JSON.stringify(site), user.workspaceId, site.id],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        site.id,
        'Monitoring site updated',
        JSON.stringify({ before: prior, after: site }),
        timestamp(),
      ),
    ]);
    return c.json({ site });
  });
  app.delete('/api/members/:id', async (c) => {
    coordinator(c);
    await body(c, z.object({}).strict());
    const user = c.get('user');
    const member = await storage.get<{ id: string; name: string; role: User['role'] }>(
      'SELECT id,name,role FROM users WHERE workspace_id=? AND id=?',
      [user.workspaceId, c.req.param('id')],
    );
    if (!member) fail(404, 'That member was not found in your workspace.');
    if (member.id === user.id || member.role === 'coordinator')
      fail(
        409,
        'Coordinator accounts cannot be removed through member management. Use workspace deletion if appropriate.',
      );
    if (
      await storage.get(
        'SELECT id FROM tasks WHERE workspace_id=? AND assigned_user_id=? AND status!=? LIMIT 1',
        [user.workspaceId, member.id, 'completed'],
      )
    )
      fail(
        409,
        'This member has an open task. Complete or cancel their tasks before removing access.',
      );
    await storage.batch([
      {
        sql: 'DELETE FROM users WHERE workspace_id=? AND id=?',
        params: [user.workspaceId, member.id],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        member.id,
        'Member access removed',
        `${member.name}. Sessions revoked. Authored evidence and historical task attribution retained.`,
        timestamp(),
      ),
    ]);
    return c.json({ ok: true });
  });
  app.get('/api/members', async (c) => {
    coordinator(c);
    const rows = await storage.all<UserRow>(
      `${USER_SELECT} WHERE u.workspace_id=? ORDER BY u.name LIMIT 50`,
      [c.get('user').workspaceId],
    );
    return c.json({ members: rows.map(safeUser) });
  });
  app.post('/api/members', async (c) => {
    coordinator(c);
    const input = await body(c, memberSchema),
      user = c.get('user');
    const count = await storage.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users WHERE workspace_id=?',
      [user.workspaceId],
    );
    if ((count?.count ?? 0) >= 50) fail(409, 'This workspace has reached its 50-member limit.');
    if (await storage.get('SELECT id FROM users WHERE email=?', [input.email]))
      fail(409, 'That email already belongs to an account.');
    const member: User = {
      ...user,
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: 'volunteer',
    };
    const encoded = await hashPassword(input.password, passwordIterations);
    try {
      await storage.batch([
        {
          sql: 'INSERT INTO users(id,workspace_id,email,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?,?)',
          params: [
            member.id,
            user.workspaceId,
            input.email,
            input.name,
            'volunteer',
            encoded,
            timestamp(),
          ],
        },
        auditStatement(
          user.workspaceId,
          user.name,
          member.id,
          'Volunteer account added',
          input.name,
          timestamp(),
        ),
      ]);
    } catch (error) {
      if (String(error).includes('UNIQUE')) fail(409, 'That email already belongs to an account.');
      throw error;
    }
    return c.json({ user: member }, 201);
  });
  app.post('/api/observations', async (c) => {
    const input = await body(c, observationSchema),
      user = c.get('user');
    const prior = await storage.get<{ payload: string }>(
      'SELECT payload FROM observations WHERE workspace_id=? AND author_id=? AND client_id=?',
      [user.workspaceId, user.id, input.clientId],
    );
    if (prior) {
      const observation = JSON.parse(prior.payload) as Observation;
      const site = await readOne<Site>('sites', observation.siteId, user.workspaceId);
      return c.json({
        observation,
        assessment: assessObservation(
          observation,
          site,
          await readRecords<Observation>('observations', user.workspaceId, MAX_OBSERVATIONS),
          now(),
        ),
      });
    }
    const observedMs = new Date(input.observedAt).getTime();
    if (
      observedMs > now().getTime() + 5 * 60_000 ||
      observedMs < now().getTime() - 365 * 24 * 3_600_000
    )
      fail(
        422,
        'Observation time must be within the last year and no more than five minutes in the future.',
      );
    const site = await readOne<Site>('sites', input.siteId, user.workspaceId);
    const count = await storage.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM observations WHERE workspace_id=?',
      [user.workspaceId],
    );
    if ((count?.count ?? 0) >= MAX_OBSERVATIONS)
      fail(
        409,
        'This workspace has reached its 2,000-observation limit. Export your data and contact the coordinator.',
      );
    const { clientId, ...content } = input;
    const observationId = crypto.randomUUID();
    if (content.photo) {
      const total = await storage.get<{ total: number }>(
        'SELECT COALESCE(SUM(byte_length),0) AS total FROM photos WHERE workspace_id=?',
        [user.workspaceId],
      );
      if ((total?.total ?? 0) + content.photo.length > 50_000_000)
        fail(
          409,
          'This workspace has reached its 50 MB photo allowance. Submit without a photo or export and contact the coordinator.',
        );
    }
    const observation: Observation = {
      ...content,
      observedAt: new Date(input.observedAt).toISOString(),
      id: observationId,
      authorId: user.id,
      authorName: user.name,
      createdAt: timestamp(),
      photo: content.photo ? `/api/observations/${observationId}/photo` : null,
      status: 'new',
      demo: user.isDemo,
      revision: 1,
    };
    const updatedSite = {
      ...site,
      lastCheckedAt:
        !site.lastCheckedAt || observation.observedAt > site.lastCheckedAt
          ? observation.observedAt
          : site.lastCheckedAt,
    };
    try {
      await storage.batch([
        jsonStatement('observations', observation.id, user.workspaceId, observation, {
          authorId: user.id,
          clientId,
          createdAt: observation.createdAt,
        }),
        ...(content.photo
          ? [
              {
                sql: 'INSERT INTO photos(observation_id,workspace_id,data_url,byte_length) VALUES(?,?,?,?)',
                params: [observation.id, user.workspaceId, content.photo, content.photo.length],
              },
            ]
          : []),
        // The SQL condition prevents a concurrent earlier report from moving lastCheckedAt backwards.
        {
          sql: "UPDATE sites SET payload=json_set(payload,'$.lastCheckedAt',?) WHERE workspace_id=? AND id=? AND (json_extract(payload,'$.lastCheckedAt') IS NULL OR json_extract(payload,'$.lastCheckedAt')<?)",
          params: [observation.observedAt, user.workspaceId, site.id, observation.observedAt],
        },
        auditStatement(
          user.workspaceId,
          user.name,
          observation.id,
          'Observation submitted',
          observation.concerns.join(', '),
          timestamp(),
        ),
      ]);
    } catch (error) {
      if (!String(error).includes('UNIQUE')) throw error;
      const retry = await storage.get<{ payload: string }>(
        'SELECT payload FROM observations WHERE workspace_id=? AND author_id=? AND client_id=?',
        [user.workspaceId, user.id, clientId],
      );
      if (!retry) throw error;
      const existing = JSON.parse(retry.payload) as Observation;
      return c.json({
        observation: existing,
        assessment: assessObservation(
          existing,
          site,
          await readRecords<Observation>('observations', user.workspaceId, MAX_OBSERVATIONS),
          now(),
        ),
      });
    }
    const observations = await readRecords<Observation>(
      'observations',
      user.workspaceId,
      MAX_OBSERVATIONS,
    );
    return c.json(
      { observation, assessment: assessObservation(observation, updatedSite, observations, now()) },
      201,
    );
  });
  app.post('/api/import', async (c) => {
    coordinator(c);
    const input = await body(c, importSchema),
      user = c.get('user');
    if (!user.isDemo && (input.sourceDemo || input.observations.some((row) => row.demo)))
      fail(
        422,
        'Synthetic demonstration records cannot be imported into a real workspace. Use a demo workspace to practise.',
      );
    const sites = await readRecords<Site>('sites', user.workspaceId, MAX_SITES);
    const siteIds = new Set(sites.map((site) => site.id));
    for (const [index, row] of input.observations.entries()) {
      if (!siteIds.has(row.siteId))
        fail(422, `Row ${index + 1}: choose an existing site in this workspace.`);
      const observedMs = new Date(row.observedAt).getTime();
      if (
        observedMs > now().getTime() + 5 * 60_000 ||
        observedMs < now().getTime() - 365 * 24 * 3_600_000
      )
        fail(
          422,
          `Row ${index + 1}: observation time must be within the last year and no more than five minutes in the future.`,
        );
    }
    const existing = await storage.all<{ client_id: string; payload: string }>(
      'SELECT client_id,payload FROM observations WHERE workspace_id=? AND author_id=?',
      [user.workspaceId, user.id],
    );
    const existingIds = new Set(existing.map((row) => row.client_id));
    const pending = input.observations.filter((row) => !existingIds.has(row.clientId));
    const count = await storage.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM observations WHERE workspace_id=?',
      [user.workspaceId],
    );
    if ((count?.count ?? 0) + pending.length > MAX_OBSERVATIONS)
      fail(
        409,
        'This import would exceed the workspace limit of 2,000 observations. No records were imported.',
      );
    const time = timestamp();
    const records = pending.map((row) => {
      const { clientId, demo: _sourceDemo, photo: _photo, ...content } = row;
      const observation: Observation = {
        ...content,
        observedAt: new Date(row.observedAt).toISOString(),
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.name,
        createdAt: time,
        photo: null,
        status: 'new',
        demo: user.isDemo,
        revision: 1,
      };
      return { clientId, observation };
    });
    const statements: SQLStatement[] = [];
    // 12 records * 6 parameters stays below D1's 100-bound-parameter statement limit.
    for (let offset = 0; offset < records.length; offset += 12) {
      const chunk = records.slice(offset, offset + 12);
      statements.push({
        sql: `INSERT INTO observations(id,workspace_id,author_id,client_id,payload,created_at) VALUES ${chunk.map(() => '(?,?,?,?,?,?)').join(',')} ON CONFLICT(workspace_id,author_id,client_id) DO NOTHING`,
        params: chunk.flatMap(({ clientId, observation }) => [
          observation.id,
          user.workspaceId,
          user.id,
          clientId,
          JSON.stringify(observation),
          time,
        ]),
      });
    }
    if (records.length) {
      statements.push({
        sql: "UPDATE sites SET payload=json_set(payload,'$.lastCheckedAt',(SELECT MAX(json_extract(observations.payload,'$.observedAt')) FROM observations WHERE observations.workspace_id=sites.workspace_id AND json_extract(observations.payload,'$.siteId')=sites.id)) WHERE workspace_id=? AND id IN (SELECT DISTINCT json_extract(payload,'$.siteId') FROM observations WHERE workspace_id=?)",
        params: [user.workspaceId, user.workspaceId],
      });
      statements.push(
        auditStatement(
          user.workspaceId,
          user.name,
          user.workspaceId,
          'Observations imported',
          `${records.length} input records accepted through the coordinator import. Original observer identity and review status are not imported; ${user.name} is the accountable importing author. Synthetic flags follow the destination workspace. Retry keys retained.`,
          time,
        ),
      );
      await storage.batch(statements);
    }
    const keys = new Set(input.observations.map((row) => row.clientId));
    const finalRows = await storage.all<{ client_id: string; payload: string }>(
      'SELECT client_id,payload FROM observations WHERE workspace_id=? AND author_id=?',
      [user.workspaceId, user.id],
    );
    const observations = finalRows
      .filter((row) => keys.has(row.client_id))
      .map((row) => JSON.parse(row.payload) as Observation);
    const insertedIds = new Set(records.map((row) => row.observation.id));
    const imported = observations.filter((row) => insertedIds.has(row.id)).length;
    return c.json(
      { imported, skipped: input.observations.length - imported, observations },
      imported ? 201 : 200,
    );
  });
  app.get('/api/observations/:id/photo', async (c) => {
    const row = await storage.get<{ data_url: string }>(
      'SELECT data_url FROM photos WHERE workspace_id=? AND observation_id=?',
      [c.get('user').workspaceId, c.req.param('id')],
    );
    if (!row) fail(404, 'This photo was not found in your workspace.');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(row.data_url);
    if (!match) fail(404, 'This photo is unavailable.');
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    return c.body(bytes, 200, {
      'Content-Type': match[1],
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
  });
  app.post('/api/observations/:id/review', async (c) => {
    coordinator(c);
    const input = await body(c, reviewSchema),
      user = c.get('user');
    const observation = await readOne<Observation>(
      'observations',
      c.req.param('id'),
      user.workspaceId,
    );
    if (observation.revision !== input.revision)
      fail(409, 'This report changed since you opened it. Refresh and review the latest version.');
    const next: Record<Observation['status'], string | null> = {
      new: 'reviewed',
      reviewed: 'actioned',
      actioned: 'resolved',
      resolved: null,
    };
    if (next[observation.status] !== input.status)
      fail(409, 'Follow the review sequence: new → reviewed → actioned → resolved.');
    if (input.status === 'resolved') {
      const tasks = await readRecords<FieldTask>('tasks', user.workspaceId, MAX_TASKS);
      const action = await storage.get<{ created_at: string }>(
        "SELECT created_at FROM audits WHERE workspace_id=? AND json_extract(payload,'$.entityId')=? AND json_extract(payload,'$.action')='Report actioned' ORDER BY created_at DESC LIMIT 1",
        [user.workspaceId, observation.id],
      );
      const recheck = tasks.find(
        (task) =>
          task.observationId === observation.id &&
          task.kind === 'recheck' &&
          task.status === 'completed' &&
          task.completedAt &&
          task.completedAt >= (action?.created_at ?? observation.createdAt) &&
          (task.result?.trim().length ?? 0) >= 12,
      );
      if (!recheck)
        fail(
          409,
          'Complete a recheck task after the action, with recorded evidence, before resolving this report. An action alone is not evidence that conditions improved.',
        );
    }
    const reviewedSite = await readOne<Site>('sites', observation.siteId, user.workspaceId);
    const currentAssessment = assessObservation(
      observation,
      reviewedSite,
      await readRecords<Observation>('observations', user.workspaceId, MAX_OBSERVATIONS),
      now(),
    );
    const decision: DecisionSnapshot = {
      engineVersion: ENGINE_VERSION,
      assessedAt: timestamp(),
      score: currentAssessment.score,
      priority: currentAssessment.priority,
      evidence: currentAssessment.evidence,
      reasons: currentAssessment.reasons,
    };
    const reviewedAt = timestamp();
    const updated: Observation = {
      ...observation,
      status: input.status,
      revision: observation.revision + 1,
      ...(input.status === 'actioned' ? { actionedAt: reviewedAt } : {}),
    };
    const result = await storage.batch([
      {
        sql: 'UPDATE observations SET payload=?,revision=? WHERE workspace_id=? AND id=? AND revision=?',
        params: [
          JSON.stringify(updated),
          updated.revision,
          user.workspaceId,
          observation.id,
          input.revision,
        ],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        observation.id,
        `Report ${input.status}`,
        input.note,
        reviewedAt,
        true,
        decision,
      ),
    ]);
    if (!result[0].changes)
      fail(409, 'This report changed since you opened it. Refresh and review the latest version.');
    return c.json({ observation: updated });
  });
  app.post('/api/tasks', async (c) => {
    coordinator(c);
    const input = await body(c, taskSchema),
      user = c.get('user');
    const observation = await readOne<Observation>(
      'observations',
      input.observationId,
      user.workspaceId,
    );
    if (observation.status === 'resolved')
      fail(409, 'This report is already resolved. Submit a new observation for new conditions.');
    if (
      new Date(input.dueAt).getTime() < now().getTime() - 60_000 ||
      new Date(input.dueAt).getTime() > now().getTime() + 365 * 24 * 3_600_000
    )
      fail(422, 'Choose a due time in the coming year.');
    const siteObservations = await readRecords<Observation>(
      'observations',
      user.workspaceId,
      MAX_OBSERVATIONS,
    );
    const hazardousObservation = siteObservations.find(
      (item) =>
        item.siteId === observation.siteId &&
        item.status !== 'resolved' &&
        unsafeForVolunteer(item),
    );
    const taskSite = await readOne<Site>('sites', observation.siteId, user.workspaceId);
    const hazard = hazardousObservation
      ? unsafeForVolunteer(hazardousObservation)
      : taskSite.sensitive
        ? 'Sensitive or restricted site: no volunteer dispatch. The coordinator must arrange qualified assessment and confirm permissions.'
        : null;
    const assignees = await storage.all<{ id: string; name: string; role: User['role'] }>(
      'SELECT id,name,role FROM users WHERE workspace_id=? AND (id=? OR name=?) LIMIT 2',
      [user.workspaceId, input.assignedTo, input.assignedTo],
    );
    if (assignees.length !== 1)
      fail(422, 'Assign this task to a workspace member using their unique name or member ID.');
    const assignee = assignees[0];
    if ((input.kind === 'sample' || input.kind === 'cleanup') && assignee.role !== 'coordinator')
      fail(
        422,
        'Assign sampling or cleanup coordination to a coordinator who can arrange qualified staff, permissions, and safety procedures. Volunteer accounts are limited to safe-viewpoint verification and rechecks.',
      );
    if (hazard && input.kind !== 'recheck')
      fail(422, `${hazard} Only a coordinator recheck of authority advice may be recorded.`);
    // Hazardous rechecks are administrative confirmations of authority advice, never volunteer dispatch.
    if (hazard && assignee.id !== user.id)
      fail(
        422,
        'A hazardous-site recheck must be assigned to the coordinator to record authority advice, not a volunteer visit.',
      );
    const tasks = await readRecords<FieldTask>('tasks', user.workspaceId, MAX_TASKS);
    if (tasks.length >= MAX_TASKS) fail(409, 'The workspace has reached its 2,000-task limit.');
    if (tasks.some((task) => task.siteId === observation.siteId && task.status !== 'completed'))
      fail(409, 'This site already has an open task. Complete it before adding another.');
    const task: FieldTask = {
      ...input,
      assignedTo: assignee.name,
      id: crypto.randomUUID(),
      siteId: observation.siteId,
      dueAt: new Date(input.dueAt).toISOString(),
      status: 'planned',
      createdAt: timestamp(),
      completedAt: null,
      result: null,
    };
    try {
      await storage.batch([
        jsonStatement('tasks', task.id, user.workspaceId, task, {
          ...task,
          assignedUserId: assignee.id,
        }),
        auditStatement(
          user.workspaceId,
          user.name,
          task.id,
          'Task assigned',
          `${task.title} → ${task.assignedTo}${hazard ? '. Administrative authority-advice recheck only; no volunteer dispatch.' : ''}`,
          timestamp(),
          false,
          undefined,
          task.observationId,
        ),
      ]);
    } catch (error) {
      if (String(error).includes('UNIQUE'))
        fail(409, 'This site already has an open task. Refresh to see it.');
      throw error;
    }
    return c.json({ task }, 201);
  });
  app.delete('/api/tasks/:id', async (c) => {
    coordinator(c);
    await body(c, z.object({}).strict());
    const user = c.get('user');
    const task = await readOne<FieldTask>('tasks', c.req.param('id'), user.workspaceId);
    if (task.status === 'completed')
      fail(409, 'Completed tasks are evidence records and cannot be cancelled.');
    const results = await storage.batch([
      {
        sql: 'DELETE FROM tasks WHERE workspace_id=? AND id=? AND status!=?',
        params: [user.workspaceId, task.id, 'completed'],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        task.id,
        'Task cancelled',
        `${task.title} cancelled. Prior state: ${task.status}; kind: ${task.kind}; assigned to: ${task.assignedTo}; due: ${task.dueAt}; estimate: ${task.estimatedMinutes} minutes; created: ${task.createdAt}. Recorded result: ${task.result ?? 'None recorded.'}`,
        timestamp(),
        true,
        undefined,
        task.observationId,
      ),
    ]);
    if (!results[0].changes)
      fail(
        409,
        'The task changed while cancellation was processed. Refresh to inspect its evidence.',
      );
    return c.json({ ok: true });
  });
  app.post('/api/tasks/:id', async (c) => {
    const input = await body(c, taskUpdateSchema),
      user = c.get('user');
    const task = await readOne<FieldTask>('tasks', c.req.param('id'), user.workspaceId);
    const assignment = await storage.get<{ assigned_user_id: string }>(
      'SELECT assigned_user_id FROM tasks WHERE workspace_id=? AND id=?',
      [user.workspaceId, task.id],
    );
    if (user.role !== 'coordinator' && assignment?.assigned_user_id !== user.id)
      fail(403, 'Only the assigned volunteer or coordinator can update this task.');
    const currentObservations = await readRecords<Observation>(
      'observations',
      user.workspaceId,
      MAX_OBSERVATIONS,
    );
    const taskSite = await readOne<Site>('sites', task.siteId, user.workspaceId);
    if (
      user.role !== 'coordinator' &&
      (taskSite.sensitive ||
        currentObservations.some(
          (item) =>
            item.siteId === task.siteId && item.status !== 'resolved' && unsafeForVolunteer(item),
        ))
    )
      fail(
        403,
        'A hazardous condition has been reported at this site. Do not visit; the coordinator must review or record authority advice.',
      );
    if (
      task.status === 'completed' ||
      (task.status === 'in_progress' && input.status === 'in_progress')
    )
      fail(409, 'This task already moved past that state. Refresh to see its current status.');
    const updated: FieldTask = {
      ...task,
      status: input.status,
      result: input.result ?? task.result,
      completedAt: input.status === 'completed' ? timestamp() : null,
    };
    const result = await storage.batch([
      {
        sql: 'UPDATE tasks SET payload=?,status=? WHERE workspace_id=? AND id=? AND status=?',
        params: [JSON.stringify(updated), updated.status, user.workspaceId, task.id, task.status],
      },
      auditStatement(
        user.workspaceId,
        user.name,
        task.id,
        input.status === 'completed' ? 'Task completed' : 'Task started',
        input.result ?? task.title,
        timestamp(),
        true,
        undefined,
        task.observationId,
      ),
    ]);
    if (!result[0].changes)
      fail(409, 'This task changed while you were editing. Refresh and try again.');
    return c.json({ task: updated });
  });
  app.post('/api/plan', async (c) => {
    const input = await body(c, budgetSchema),
      data = await workspace(c.get('user'), c.get('userRow').scenario_date);
    return c.json(
      buildFieldPlan(data.sites, data.observations, data.tasks, input.budgetMinutes, now()),
    );
  });
  app.post('/api/plan/commit', async (c) => {
    coordinator(c);
    const input = await body(c, budgetSchema),
      user = c.get('user'),
      data = await workspace(user, c.get('userRow').scenario_date);
    const plan = buildFieldPlan(
      data.sites,
      data.observations,
      data.tasks,
      input.budgetMinutes,
      now(),
    );
    if (data.tasks.length + plan.items.length > MAX_TASKS)
      fail(409, 'The workspace task limit would be exceeded.');
    const tasks: FieldTask[] = plan.items.map((item) => ({
      id: crypto.randomUUID(),
      observationId: item.observationId,
      siteId: item.siteId,
      title: item.title,
      kind: 'verify',
      status: 'planned',
      assignedTo: user.name,
      dueAt: new Date(now().getTime() + 24 * 3_600_000).toISOString(),
      createdAt: timestamp(),
      completedAt: null,
      result: null,
      estimatedMinutes: item.minutes,
    }));
    if (tasks.length) {
      const statements: SQLStatement[] = [];
      // Keep a full-budget plan comfortably within D1's per-invocation query and bound-parameter limits.
      for (let offset = 0; offset < tasks.length; offset += 12) {
        const chunk = tasks.slice(offset, offset + 12);
        statements.push({
          sql: `INSERT INTO tasks(id,workspace_id,observation_id,site_id,assigned_user_id,status,payload) VALUES ${chunk.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
          params: chunk.flatMap((task) => [
            task.id,
            user.workspaceId,
            task.observationId,
            task.siteId,
            user.id,
            task.status,
            JSON.stringify(task),
          ]),
        });
        const taskAudits = chunk.map((task) =>
          auditStatement(
            user.workspaceId,
            user.name,
            task.id,
            'Task assigned',
            `${task.title} → ${task.assignedTo}. Assigned through the approved ${plan.budgetMinutes}-minute field plan. Coordinator confirms safe public access before dispatch.`,
            timestamp(),
            false,
            undefined,
            task.observationId,
          ),
        );
        statements.push({
          sql: `INSERT INTO audits(id,workspace_id,payload,created_at) VALUES ${chunk.map(() => '(?,?,?,?)').join(',')}`,
          params: taskAudits.flatMap((statement) => statement.params!),
        });
      }
      statements.push(
        auditStatement(
          user.workspaceId,
          user.name,
          user.workspaceId,
          'Field plan committed',
          `${tasks.length} safe-viewpoint verification tasks; ${plan.usedMinutes}/${plan.budgetMinutes} estimated minutes. Coordinator confirms access before dispatch.`,
          timestamp(),
        ),
      );
      try {
        await storage.batch(statements);
      } catch (error) {
        if (String(error).includes('UNIQUE'))
          fail(
            409,
            'A task was added while you planned. Rebuild the plan to avoid duplicate dispatch.',
          );
        throw error;
      }
    }
    return c.json({ tasks }, 201);
  });
  app.get('/api/export', async (c) => {
    coordinator(c);
    const format = c.req.query('format') ?? 'json';
    if (!['json', 'csv', 'geojson', 'fhir'].includes(format))
      fail(422, 'Choose json, csv, geojson, or fhir export.');
    const data = await workspace(c.get('user'), c.get('userRow').scenario_date, true);
    c.header(
      'Content-Disposition',
      `attachment; filename="rill-${data.user.isDemo ? 'synthetic-demo' : 'workspace'}-${timestamp().slice(0, 10)}.${format === 'fhir' ? 'fhir.json' : format}"`,
    );
    if (format === 'csv')
      return c.body(exportCSV(data), 200, { 'Content-Type': 'text/csv; charset=utf-8' });
    const result =
      format === 'fhir'
        ? exportFHIR(data, now())
        : format === 'geojson'
          ? exportGeoJSON(data, now())
          : exportJSON(data, now());
    return c.body(JSON.stringify(result, null, 2), 200, {
      'Content-Type':
        format === 'fhir'
          ? 'application/fhir+json; charset=utf-8'
          : format === 'geojson'
            ? 'application/geo+json; charset=utf-8'
            : 'application/json; charset=utf-8',
    });
  });
  app.delete('/api/account', async (c) => {
    coordinator(c);
    const input = await body(c, z.object({ password: z.string().max(128).optional() }).strict()),
      user = c.get('user');
    if (
      !user.isDemo &&
      (!input.password ||
        !c.get('userRow').password_hash ||
        !(await verifyPassword(input.password, c.get('userRow').password_hash!)))
    )
      fail(403, 'Enter your current password to delete this workspace.');
    await storage.run('DELETE FROM workspaces WHERE id=?', [user.workspaceId]);
    deleteCookie(c, SESSION_COOKIE, { path: '/', secure, httpOnly: true, sameSite: 'Lax' });
    return c.json({ ok: true });
  });
  app.notFound((c) => c.json({ error: 'API route not found.' }, 404));
  return app;
}

/** Call at startup/scheduled maintenance. Deletes expired sessions, old limits, and demo workspaces after 48h. */
export async function pruneExpiredData(storage: Storage, now = new Date()): Promise<void> {
  await storage.batch([
    { sql: 'DELETE FROM sessions WHERE expires_at<=?', params: [now.toISOString()] },
    { sql: 'DELETE FROM rate_limits WHERE reset_at<=?', params: [now.getTime()] },
    {
      sql: 'DELETE FROM workspaces WHERE is_demo=1 AND created_at<?',
      params: [new Date(now.getTime() - 48 * 3_600_000).toISOString()],
    },
  ]);
}
