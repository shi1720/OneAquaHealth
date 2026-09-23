import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, pruneExpiredData } from '../server/app';
import { SQLiteStorage } from '../server/sqlite';
import { LibSQLStorage } from '../server/libsql';
import { csvCell, exportFHIR } from '../server/export';
import { createCatalogLoader, ONEAQUAHEALTH_CATALOG_SOURCE } from '../server/catalog';
import { validPhoto } from '../server/security';
import type { FieldTask, Observation, User, WorkspaceData } from '../shared/types';

let db: SQLiteStorage | LibSQLStorage, app: ReturnType<typeof createApp>, directory: string;
let currentTime = new Date('2026-09-23T10:00:00Z');
const origin = 'http://localhost';
const password = 'a carefully chosen passphrase';
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];
function request(
  path: string,
  method = 'GET',
  data?: unknown,
  cookie?: string,
  headers: Record<string, string> = {},
) {
  return app.request(`${origin}${path}`, {
    method,
    headers: {
      ...(method !== 'GET' ? { origin, 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
async function demo() {
  const response = await request('/api/auth/demo', 'POST', {});
  expect(response.status).toBe(201);
  return { cookie: cookieOf(response), user: (await response.json()).user as User };
}
async function register(email = 'coordinator@example.test', name = 'Shivam Gupta') {
  const response = await request('/api/auth/register', 'POST', {
    name,
    email,
    password,
    workspaceName: 'Local stream team',
  });
  expect(response.status).toBe(201);
  return { cookie: cookieOf(response), user: (await response.json()).user as User };
}
async function data(cookie: string): Promise<WorkspaceData> {
  return (await request('/api/workspace', 'GET', undefined, cookie)).json();
}
function report(siteId: string, overrides: Record<string, unknown> = {}) {
  return {
    siteId,
    observedAt: currentTime.toISOString(),
    concerns: ['foam'],
    clarity: 'unsure',
    flow: 'steady',
    confidence: 'unsure',
    notes: 'Foam visible from the safe public path.',
    clientId: crypto.randomUUID(),
    ...overrides,
  };
}
const siteInput = {
  name: 'Local park stream',
  catchment: 'Local catchment',
  lat: 40.2,
  lng: -8.4,
  description: 'A site supplied by a coordinator.',
  habitat: 'Urban stream',
  access: 'View from the public path only.',
  exposure: 4,
  walkMinutes: 10,
  sensitive: false,
};

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'rill-test-'));
  db =
    process.env.RILL_TEST_STORAGE === 'libsql'
      ? await LibSQLStorage.connect(`file:${join(directory, 'test.sqlite')}`)
      : new SQLiteStorage(join(directory, 'test.sqlite'));
  currentTime = new Date('2026-09-23T10:00:00Z');
  app = createApp(db, { now: () => currentTime, passwordIterations: 100_000 });
});
afterEach(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('authentication and tenant boundaries', () => {
  it('requires authentication and reports health without exposing credentials', async () => {
    expect((await request('/api/workspace')).status).toBe(401);
    expect(await (await request('/api/health')).json()).toEqual({
      status: 'ok',
      version: '1.0.0',
      storage: process.env.RILL_TEST_STORAGE === 'libsql' ? 'libsql' : 'sqlite',
    });
  });
  it('creates independent synthetic demo workspaces, HttpOnly sessions, and prevents cross-tenant record updates', async () => {
    const first = await demo(),
      second = await demo();
    expect(first.user.workspaceId).not.toBe(second.user.workspaceId);
    const firstData = await data(first.cookie);
    expect(firstData.sites).toHaveLength(6);
    expect(firstData.observations.length).toBeGreaterThan(5);
    const created = await request(
      '/api/observations',
      'POST',
      report(firstData.sites[0].id),
      first.cookie,
    );
    expect(created.status).toBe(201);
    const own = (await created.json()).observation as Observation;
    expect(
      (
        await request(
          `/api/observations/${own.id}/review`,
          'POST',
          { status: 'reviewed', revision: 1, note: 'Coordinator checked report details.' },
          second.cookie,
        )
      ).status,
    ).toBe(404);
    expect((await data(second.cookie)).observations.some((item) => item.id === own.id)).toBe(false);
    const response = await request('/api/auth/demo', 'POST', {});
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  });
  it('derives task update permissions from stable user IDs rather than matching display names', async () => {
    const account = await demo();
    const observation = (await data(account.cookie)).observations[0];
    const member = (
      await (
        await request(
          '/api/members',
          'POST',
          { email: 'owner@example.test', name: 'Shared Name', password },
          account.cookie,
        )
      ).json()
    ).user as User;
    await request(
      '/api/members',
      'POST',
      { email: 'other@example.test', name: 'Shared Name', password },
      account.cookie,
    );
    const ownedCookie = cookieOf(
      await request('/api/auth/login', 'POST', { email: 'owner@example.test', password }),
    );
    const otherCookie = cookieOf(
      await request('/api/auth/login', 'POST', { email: 'other@example.test', password }),
    );
    const response = await request(
      '/api/tasks',
      'POST',
      {
        observationId: observation.id,
        title: 'Verify from the public path',
        kind: 'verify',
        assignedTo: member.id,
        dueAt: '2026-09-24T10:00:00Z',
        estimatedMinutes: 20,
      },
      account.cookie,
    );
    expect(response.status).toBe(201);
    const task = (await response.json()).task as FieldTask;
    const coordinatorData = await data(account.cookie),
      ownedData = await data(ownedCookie),
      otherData = await data(otherCookie);
    expect((coordinatorData.tasks[0] as FieldTask & { canUpdate: boolean }).canUpdate).toBe(true);
    expect((ownedData.tasks[0] as FieldTask & { canUpdate: boolean }).canUpdate).toBe(true);
    expect((otherData.tasks[0] as FieldTask & { canUpdate: boolean }).canUpdate).toBe(false);
    expect(
      (await request(`/api/tasks/${task.id}`, 'POST', { status: 'in_progress' }, otherCookie))
        .status,
    ).toBe(403);
    const exported = await (
      await request('/api/export?format=json', 'GET', undefined, account.cookie)
    ).json();
    expect(exported.tasks[0]).not.toHaveProperty('canUpdate');
  });
  it('registers a real empty workspace, hashes passwords, supports login/logout and session expiry', async () => {
    const account = await register();
    expect((await data(account.cookie)).observations).toEqual([]);
    expect((await data(account.cookie)).sites).toEqual([]);
    const row = await db.get<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id=?',
      [account.user.id],
    );
    expect(row?.password_hash).toMatch(/^pbkdf2-sha256\$/);
    expect(row?.password_hash).not.toContain(password);
    expect(
      (
        await request('/api/auth/login', 'POST', {
          email: account.user.email,
          password: 'wrong password',
        })
      ).status,
    ).toBe(401);
    const login = await request('/api/auth/login', 'POST', {
      email: account.user.email.toUpperCase(),
      password,
    });
    expect(login.status).toBe(200);
    const cookie = cookieOf(login);
    expect((await request('/api/auth/me', 'GET', undefined, cookie)).status).toBe(200);
    expect((await request('/api/auth/logout', 'POST', {}, cookie)).status).toBe(200);
    expect((await request('/api/workspace', 'GET', undefined, cookie)).status).toBe(401);
    currentTime = new Date('2026-10-02T10:00:00Z');
    expect((await request('/api/workspace', 'GET', undefined, account.cookie)).status).toBe(401);
  });
  it('uses Secure cookies on production and rejects a wrong or missing Origin', async () => {
    const secureApp = createApp(db, { production: true, origin, passwordIterations: 100_000 });
    const response = await secureApp.request(`${origin}/api/auth/demo`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(
      (await request('/api/auth/demo', 'POST', {}, undefined, { origin: 'https://attacker.test' }))
        .status,
    ).toBe(403);
    expect(
      (
        await app.request(`${origin}/api/auth/demo`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect(
      (await request('/api/auth/demo', 'POST', {}, undefined, { 'sec-fetch-site': 'cross-site' }))
        .status,
    ).toBe(403);
  });
  it('validates schema, blocks escalation fields, and persists rate limits', async () => {
    expect(
      (
        await request('/api/auth/register', 'POST', {
          name: 'Me',
          email: 'invalid',
          password: 'short',
          workspaceName: 'Name',
        })
      ).status,
    ).toBe(422);
    expect((await request('/api/auth/demo', 'POST', { role: 'admin' })).status).toBe(422);
    for (let index = 0; index < 20; index++)
      expect((await request('/api/auth/demo', 'POST', {})).status).toBe(201);
    app = createApp(db, { now: () => currentTime, passwordIterations: 100_000 });
    expect((await request('/api/auth/demo', 'POST', {})).status).toBe(429);
  });
  it('limits volunteer permissions and allows assigned volunteer completion using stable IDs', async () => {
    const account = await demo();
    const memberResponse = await request(
      '/api/members',
      'POST',
      { email: 'volunteer@example.test', name: 'Volunteer One', password },
      account.cookie,
    );
    expect(memberResponse.status).toBe(201);
    const login = await request('/api/auth/login', 'POST', {
      email: 'volunteer@example.test',
      password,
    });
    const volunteerCookie = cookieOf(login);
    const observation = (await data(account.cookie)).observations[0];
    expect(
      (
        await request(
          `/api/observations/${observation.id}/review`,
          'POST',
          { status: 'reviewed', revision: 1, note: 'I want to promote this report.' },
          volunteerCookie,
        )
      ).status,
    ).toBe(403);
    expect(
      (await request('/api/plan/commit', 'POST', { budgetMinutes: 60 }, volunteerCookie)).status,
    ).toBe(403);
    expect(
      (await request('/api/export?format=json', 'GET', undefined, volunteerCookie)).status,
    ).toBe(403);
    expect((await request('/api/sites', 'POST', siteInput, volunteerCookie)).status).toBe(403);
    const taskResponse = await request(
      '/api/tasks',
      'POST',
      {
        observationId: observation.id,
        title: 'Verify report from public path',
        kind: 'verify',
        assignedTo: 'Volunteer One',
        dueAt: '2026-09-24T10:00:00Z',
        estimatedMinutes: 20,
      },
      account.cookie,
    );
    expect(taskResponse.status).toBe(201);
    const task = (await taskResponse.json()).task as FieldTask;
    expect(
      (
        await request(
          `/api/tasks/${task.id}`,
          'POST',
          { status: 'completed', result: 'Observed from path, foam no longer visible.' },
          volunteerCookie,
        )
      ).status,
    ).toBe(200);
  });
});

describe('report, review, action, and verification lifecycle', () => {
  it('validates observations and idempotently handles retry without updating site time backwards', async () => {
    const account = await demo(),
      workspace = await data(account.cookie),
      site = workspace.sites[0];
    const input = report(site.id);
    const first = await request('/api/observations', 'POST', input, account.cookie);
    expect(first.status).toBe(201);
    const created = (await first.json()).observation as Observation;
    const retry = await request('/api/observations', 'POST', input, account.cookie);
    expect(retry.status).toBe(200);
    expect((await retry.json()).observation.id).toBe(created.id);
    expect(
      (
        await request(
          '/api/observations',
          'POST',
          report(site.id, { observedAt: '2026-10-01T10:00:00Z' }),
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          '/api/observations',
          'POST',
          report(site.id, { concerns: ['clear', 'foam'] }),
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          '/api/observations',
          'POST',
          report(site.id, { concerns: ['foam', 'foam'] }),
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (await request('/api/observations', 'POST', report('not-a-site'), account.cookie)).status,
    ).toBe(404);
    await request(
      '/api/observations',
      'POST',
      report(site.id, { observedAt: '2026-09-22T10:00:00Z' }),
      account.cookie,
    );
    expect(
      (await data(account.cookie)).sites.find((item) => item.id === site.id)?.lastCheckedAt,
    ).toBe(currentTime.toISOString());
  });
  it('enforces revisions, sequential human review and evidence before resolution', async () => {
    const account = await demo();
    const observation = (await data(account.cookie)).observations[0];
    const review = (status: string, revision: number) =>
      request(
        `/api/observations/${observation.id}/review`,
        'POST',
        { status, revision, note: 'Coordinator decision recorded with context.' },
        account.cookie,
      );
    expect((await review('resolved', 1)).status).toBe(409);
    expect((await review('reviewed', 1)).status).toBe(200);
    expect((await review('actioned', 1)).status).toBe(409);
    expect((await review('actioned', 2)).status).toBe(200);
    expect((await review('resolved', 3)).status).toBe(409);
    const response = await request(
      '/api/tasks',
      'POST',
      {
        observationId: observation.id,
        title: 'Recheck whether visible foam persists',
        kind: 'recheck',
        assignedTo: account.user.name,
        dueAt: '2026-09-24T10:00:00Z',
        estimatedMinutes: 20,
      },
      account.cookie,
    );
    expect(response.status).toBe(201);
    const task = (await response.json()).task as FieldTask;
    expect(
      (
        await request(
          `/api/tasks/${task.id}`,
          'POST',
          { status: 'completed', result: 'Done' },
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (await request(`/api/tasks/${task.id}`, 'POST', { status: 'in_progress' }, account.cookie))
        .status,
    ).toBe(200);
    expect(
      (
        await request(
          `/api/tasks/${task.id}`,
          'POST',
          {
            status: 'completed',
            result:
              'A second safe-path observation found no visible foam. This does not determine water safety.',
          },
          account.cookie,
        )
      ).status,
    ).toBe(200);
    expect((await review('resolved', 3)).status).toBe(200);
    const updated = await data(account.cookie);
    expect(updated.observations.find((item) => item.id === observation.id)?.revision).toBe(4);
    expect(updated.activity.some((item) => item.action === 'Report resolved')).toBe(true);
  });
  it('commits a budget plan without duplicate dispatch and rejects hazardous volunteer work', async () => {
    const account = await demo();
    const planned = await request('/api/plan', 'POST', { budgetMinutes: 60 }, account.cookie);
    expect(planned.status).toBe(200);
    const response = await request(
      '/api/plan/commit',
      'POST',
      { budgetMinutes: 60 },
      account.cookie,
    );
    expect(response.status).toBe(201);
    const first = (await response.json()).tasks as FieldTask[];
    expect(first.length).toBeGreaterThan(0);
    await request('/api/plan/commit', 'POST', { budgetMinutes: 60 }, account.cookie);
    const current = await data(account.cookie);
    expect(new Set(current.tasks.map((item) => item.siteId)).size).toBe(current.tasks.length);
    const unusedSite = current.sites.find(
      (site) => !current.tasks.some((task) => task.siteId === site.id),
    )!;
    const hazardResponse = await request(
      '/api/observations',
      'POST',
      report(unusedSite.id, { concerns: ['dead_fish'] }),
      account.cookie,
    );
    const hazard = (await hazardResponse.json()).observation as Observation;
    const taskInput = {
      observationId: hazard.id,
      title: 'Visit the reported fish incident',
      kind: 'verify',
      assignedTo: account.user.name,
      dueAt: '2026-09-24T10:00:00Z',
      estimatedMinutes: 20,
    };
    expect((await request('/api/tasks', 'POST', taskInput, account.cookie)).status).toBe(422);
    const plan = await (
      await request('/api/plan', 'POST', { budgetMinutes: 480 }, account.cookie)
    ).json();
    expect(plan.items.some((item: { siteId: string }) => item.siteId === unusedSite.id)).toBe(
      false,
    );
  });
  it('atomically handles concurrent review revisions and duplicate report retries', async () => {
    const account = await demo();
    const initial = (await data(account.cookie)).observations[0];
    const results = await Promise.all(
      [1, 2].map(() =>
        request(
          `/api/observations/${initial.id}/review`,
          'POST',
          {
            status: 'reviewed',
            revision: 1,
            note: 'Two coordinators reviewing the same revision.',
          },
          account.cookie,
        ),
      ),
    );
    expect(results.map((item) => item.status).sort()).toEqual([200, 409]);
    expect(
      (await data(account.cookie)).activity.filter(
        (item) => item.entityId === initial.id && item.action === 'Report reviewed',
      ),
    ).toHaveLength(1);
    const input = report(initial.siteId);
    const duplicates = await Promise.all(
      [1, 2].map(() => request('/api/observations', 'POST', input, account.cookie)),
    );
    expect(duplicates.map((item) => item.status).sort()).toEqual([200, 201]);
    const values = await Promise.all(duplicates.map((item) => item.json()));
    expect(values[0].observation.id).toBe(values[1].observation.id);
  });
  it('blocks recheck evidence completed before the recorded action', async () => {
    const account = await demo();
    const observation = (await data(account.cookie)).observations[0];
    const response = await request(
      '/api/tasks',
      'POST',
      {
        observationId: observation.id,
        title: 'Recheck from safe public path',
        kind: 'recheck',
        assignedTo: account.user.name,
        dueAt: '2026-09-24T10:00:00Z',
        estimatedMinutes: 20,
      },
      account.cookie,
    );
    const task = (await response.json()).task as FieldTask;
    await request(
      `/api/tasks/${task.id}`,
      'POST',
      { status: 'completed', result: 'Foam unchanged in an earlier check before the action.' },
      account.cookie,
    );
    currentTime = new Date('2026-09-23T11:00:00Z');
    await request(
      `/api/observations/${observation.id}/review`,
      'POST',
      {
        status: 'reviewed',
        revision: 1,
        note: 'Reviewing the report and earlier recheck evidence.',
      },
      account.cookie,
    );
    await request(
      `/api/observations/${observation.id}/review`,
      'POST',
      {
        status: 'actioned',
        revision: 2,
        note: 'Action happened after that earlier field recheck.',
      },
      account.cookie,
    );
    expect(
      (
        await request(
          `/api/observations/${observation.id}/review`,
          'POST',
          {
            status: 'resolved',
            revision: 3,
            note: 'Trying to reuse evidence from before the action.',
          },
          account.cookie,
        )
      ).status,
    ).toBe(409);
  });
  it('allows real site setup and prevents site leakage between workspaces', async () => {
    const first = await register(),
      second = await register('another@example.test', 'Other Coordinator');
    const created = await request('/api/sites', 'POST', siteInput, first.cookie);
    expect(created.status).toBe(201);
    const site = (await created.json()).site;
    expect(
      (await request('/api/observations', 'POST', report(site.id), second.cookie)).status,
    ).toBe(404);
    expect((await request('/api/observations', 'POST', report(site.id), first.cookie)).status).toBe(
      201,
    );
  });
});

describe('exports, retention and data minimisation', () => {
  it('exports CSV, JSON, GeoJSON and experimental FHIR with resolved links and no Patient resources', async () => {
    const account = await demo();
    for (const format of ['json', 'csv', 'geojson', 'fhir']) {
      const response = await request(
        `/api/export?format=${format}`,
        'GET',
        undefined,
        account.cookie,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('synthetic-demo');
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    const json = await (
      await request('/api/export?format=json', 'GET', undefined, account.cookie)
    ).json();
    expect(JSON.stringify(json)).not.toContain(account.user.email);
    expect(json.observations[0]).not.toHaveProperty('photo');
    const fhir = exportFHIR(await data(account.cookie), currentTime);
    expect(fhir.resourceType).toBe('Bundle');
    expect(fhir.type).toBe('collection');
    expect(fhir.entry.some((item) => item.resource.resourceType === 'Patient')).toBe(false);
    const urls = new Set(fhir.entry.map((item) => item.fullUrl));
    expect(urls.size).toBe(fhir.entry.length);
    for (const item of fhir.entry.filter((item) => item.resource.resourceType === 'Observation'))
      expect(urls.has((item.resource.subject as { reference: string }).reference)).toBe(true);
    expect(JSON.stringify(fhir)).toContain('no conformance is claimed');
    expect(JSON.stringify(fhir)).not.toContain('meta.profile');
  });
  it('serves photos only to the owning workspace and keeps blobs out of workspace responses and exports', async () => {
    const first = await demo(),
      second = await demo();
    const site = (await data(first.cookie)).sites[0];
    const photo =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
    const response = await request(
      '/api/observations',
      'POST',
      report(site.id, { photo }),
      first.cookie,
    );
    expect(response.status).toBe(201);
    const observation = (await response.json()).observation as Observation;
    expect(observation.photo).toBe(`/api/observations/${observation.id}/photo`);
    const image = await request(observation.photo!, 'GET', undefined, first.cookie);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(16);
    expect((await request(observation.photo!, 'GET', undefined, second.cookie)).status).toBe(404);
    expect((await request(observation.photo!)).status).toBe(401);
    expect(JSON.stringify(await data(first.cookie))).not.toContain('base64');
    expect(
      await (await request('/api/export?format=json', 'GET', undefined, first.cookie)).text(),
    ).not.toContain('base64');
  });
  it('escapes spreadsheet formulas and rejects script-bearing or spoofed photo data', () => {
    for (const input of ['=HYPERLINK("bad")', '+cmd', '-cmd', '@SUM(A1)', ' \t=1+1', '\tplain'])
      expect(csvCell(input)).toMatch(/^"'/);
    expect(csvCell('ordinary "quote"')).toBe('"ordinary ""quote"""');
    expect(validPhoto('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(validPhoto('data:image/png;base64,aGVsbG8=')).toBe(false);
  });
  it('deletes a workspace and its dependent records only after coordinator password confirmation', async () => {
    const account = await register();
    expect(
      (await request('/api/account', 'DELETE', { password: 'incorrect' }, account.cookie)).status,
    ).toBe(403);
    expect((await request('/api/account', 'DELETE', { password }, account.cookie)).status).toBe(
      200,
    );
    expect((await request('/api/workspace', 'GET', undefined, account.cookie)).status).toBe(401);
    expect(await db.get('SELECT id FROM users WHERE id=?', [account.user.id])).toBeUndefined();
  });
  it('prunes expired demo workspaces and sessions without removing real accounts', async () => {
    const demonstration = await demo(),
      real = await register();
    await pruneExpiredData(db, new Date('2026-09-26T10:00:00Z'));
    expect(
      await db.get('SELECT id FROM workspaces WHERE id=?', [demonstration.user.workspaceId]),
    ).toBeUndefined();
    expect(
      await db.get('SELECT id FROM workspaces WHERE id=?', [real.user.workspaceId]),
    ).toBeDefined();
  });
});

describe('import, complete provenance, and bounded input', () => {
  it('imports an atomic bounded batch, preserves synthetic labeling, and makes retries harmless', async () => {
    const account = await demo();
    const site = (await data(account.cookie)).sites[0];
    const before = (await data(account.cookie)).observations.length;
    const rows = [report(site.id, { demo: false }), report(site.id)];
    expect(
      (
        await request(
          '/api/import',
          'POST',
          { observations: [...rows, report('invalid-site')] },
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect((await data(account.cookie)).observations).toHaveLength(before);
    const imported = await request(
      '/api/import',
      'POST',
      { observations: rows, sourceDemo: true },
      account.cookie,
    );
    expect(imported.status).toBe(201);
    const result = await imported.json();
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.observations.every((row: Observation) => row.demo)).toBe(true);
    const retry = await request('/api/import', 'POST', { observations: rows }, account.cookie);
    expect(retry.status).toBe(200);
    expect((await retry.json()).skipped).toBe(2);
    expect((await data(account.cookie)).observations).toHaveLength(before + 2);
    expect(
      (
        await request(
          '/api/import',
          'POST',
          { observations: Array.from({ length: 101 }, () => report(site.id)) },
          account.cookie,
        )
      ).status,
    ).toBe(422);
  });
  it('rejects synthetic records in a real workspace and imports real records against existing sites', async () => {
    const account = await register();
    const site = (await (await request('/api/sites', 'POST', siteInput, account.cookie)).json())
      .site;
    expect(
      (
        await request(
          '/api/import',
          'POST',
          { observations: [report(site.id)], sourceDemo: true },
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          '/api/import',
          'POST',
          { observations: [report(site.id, { demo: true })] },
          account.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          '/api/import',
          'POST',
          { observations: [report(site.id)], sourceDemo: false },
          account.cookie,
        )
      ).status,
    ).toBe(201);
    expect((await data(account.cookie)).observations[0].demo).toBe(false);
  });
  it('exports all audit events with human attribution and historical decision snapshots', async () => {
    const account = await demo();
    const observation = (await data(account.cookie)).observations[0];
    await request(
      `/api/observations/${observation.id}/review`,
      'POST',
      {
        status: 'reviewed',
        revision: 1,
        note: 'Review with an attributable historical priority snapshot.',
      },
      account.cookie,
    );
    const time = currentTime.toISOString();
    await db.batch(
      Array.from({ length: 105 }, (_, index) => ({
        sql: 'INSERT INTO audits(id,workspace_id,payload,created_at) VALUES(?,?,?,?)',
        params: [
          `audit-extra-${index}`,
          account.user.workspaceId,
          JSON.stringify({
            id: `audit-extra-${index}`,
            entityId: 'test',
            actorName: 'Named coordinator',
            action: 'Test event',
            detail: 'Historical record',
            createdAt: time,
          }),
          time,
        ],
      })),
    );
    expect((await data(account.cookie)).activity).toHaveLength(100);
    const exported = await (
      await request('/api/export?format=json', 'GET', undefined, account.cookie)
    ).json();
    expect(exported.activity).toHaveLength(107);
    const review = exported.activity.find(
      (item: { action: string }) => item.action === 'Report reviewed',
    );
    expect(review.actorName).toBe(account.user.name);
    expect(review.decision.engineVersion).toBeTruthy();
    expect(review.decision.reasons.length).toBeGreaterThan(0);
    expect(review.decision.assessedAt).toBe(time);
  });
  it('rejects actual oversized bytes when Content-Length is missing or deliberately understated', async () => {
    const oversized = JSON.stringify({ padding: 'x'.repeat(1_450_000) });
    for (const headers of [{}, { 'content-length': '2' }] as Record<string, string>[]) {
      const response = await app.request(`${origin}/api/auth/demo`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', ...headers },
        body: oversized,
      });
      expect(response.status).toBe(413);
    }
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1_450_001));
      },
      cancel() {
        cancelled = true;
      },
    });
    const raw = new Request(`${origin}/api/auth/demo`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'content-length': '1' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect((await app.request(raw)).status).toBe(413);
    expect(cancelled).toBe(true);
  });
});

describe('operational account and team management', () => {
  it('rotates passwords, revokes all old sessions, and retains only the new browser session', async () => {
    const account = await register();
    const second = await request('/api/auth/login', 'POST', {
      email: account.user.email,
      password,
    });
    const secondCookie = cookieOf(second);
    expect(
      (
        await request(
          '/api/auth/password',
          'POST',
          { currentPassword: 'wrong', newPassword: 'a different secure passphrase' },
          account.cookie,
        )
      ).status,
    ).toBe(403);
    const changed = await request(
      '/api/auth/password',
      'POST',
      { currentPassword: password, newPassword: 'a different secure passphrase' },
      account.cookie,
    );
    expect(changed.status).toBe(200);
    const newCookie = cookieOf(changed);
    expect(newCookie).not.toBe(account.cookie);
    expect((await request('/api/workspace', 'GET', undefined, account.cookie)).status).toBe(401);
    expect((await request('/api/workspace', 'GET', undefined, secondCookie)).status).toBe(401);
    expect((await request('/api/workspace', 'GET', undefined, newCookie)).status).toBe(200);
    expect(
      (await request('/api/auth/login', 'POST', { email: account.user.email, password })).status,
    ).toBe(401);
    expect(
      (
        await request('/api/auth/login', 'POST', {
          email: account.user.email,
          password: 'a different secure passphrase',
        })
      ).status,
    ).toBe(200);
  });
  it('edits site context with a retained audit trail and cancels open tasks without erasing evidence', async () => {
    const account = await demo();
    const current = await data(account.cookie);
    const site = current.sites[0];
    const observation = current.observations.find((item) => item.siteId === site.id)!;
    const { id: _id, lastCheckedAt: _lastChecked, ...values } = site;
    const edited = await request(
      `/api/sites/${site.id}`,
      'PATCH',
      { ...values, name: 'Updated local name', sensitive: true },
      account.cookie,
    );
    expect(edited.status).toBe(200);
    expect((await edited.json()).site.lastCheckedAt).toBe(site.lastCheckedAt);
    expect(
      (
        await (await request('/api/plan', 'POST', { budgetMinutes: 480 }, account.cookie)).json()
      ).items.some((item: { siteId: string }) => item.siteId === site.id),
    ).toBe(false);
    await request(
      `/api/sites/${site.id}`,
      'PATCH',
      { ...values, sensitive: false },
      account.cookie,
    );
    const task = (
      await (
        await request(
          '/api/tasks',
          'POST',
          {
            observationId: observation.id,
            title: 'Cancelable safe-path verification',
            kind: 'verify',
            assignedTo: account.user.name,
            dueAt: '2026-09-24T10:00:00Z',
            estimatedMinutes: 20,
          },
          account.cookie,
        )
      ).json()
    ).task;
    expect((await request(`/api/tasks/${task.id}`, 'DELETE', {}, account.cookie)).status).toBe(200);
    const updated = await data(account.cookie);
    expect(updated.tasks.some((item) => item.id === task.id)).toBe(false);
    const cancellation = updated.activity.find((item) => item.action === 'Task cancelled');
    expect(cancellation?.entityId).toBe(task.id);
    expect(cancellation!.detail).toContain(task.title);
    expect(cancellation!.detail).toContain('Prior state: planned');
  });
  it('retains observation-linked assignment, start, and cancellation history after the task is removed', async () => {
    const account = await demo();
    const response = await request(
      '/api/plan/commit',
      'POST',
      { budgetMinutes: 120 },
      account.cookie,
    );
    expect(response.status).toBe(201);
    const task = (await response.json()).tasks[0] as FieldTask;
    expect(
      (
        await request(
          `/api/tasks/${task.id}`,
          'POST',
          {
            status: 'in_progress',
            result: 'Coordinator checking access permissions before dispatch.',
          },
          account.cookie,
        )
      ).status,
    ).toBe(200);
    expect((await request(`/api/tasks/${task.id}`, 'DELETE', {}, account.cookie)).status).toBe(200);
    const updated = await data(account.cookie);
    expect(updated.tasks.some((item) => item.id === task.id)).toBe(false);
    const linked = updated.activity.filter(
      (item) =>
        (item as typeof item & { observationId?: string }).observationId === task.observationId &&
        item.entityId === task.id,
    );
    expect(linked.map((item) => item.action).sort()).toEqual([
      'Task assigned',
      'Task cancelled',
      'Task started',
    ]);
    const cancelled = linked.find((item) => item.action === 'Task cancelled')!;
    expect(cancelled.detail).toContain('Prior state: in_progress');
    expect(cancelled.detail).toContain('checking access permissions');
    const exported = await (
      await request('/api/export?format=json', 'GET', undefined, account.cookie)
    ).json();
    expect(
      exported.activity.filter(
        (item: { observationId?: string; entityId: string }) =>
          item.observationId === task.observationId && item.entityId === task.id,
      ),
    ).toHaveLength(3);
  });
  it('removes volunteer access, invalidates sessions, and preserves authored observations', async () => {
    const account = await demo();
    const member = (
      await (
        await request(
          '/api/members',
          'POST',
          { email: 'remove@example.test', name: 'Departing Volunteer', password },
          account.cookie,
        )
      ).json()
    ).user as User;
    const login = await request('/api/auth/login', 'POST', { email: member.email, password });
    const cookie = cookieOf(login);
    const site = (await data(account.cookie)).sites[0];
    const reportResponse = await request('/api/observations', 'POST', report(site.id), cookie);
    expect(reportResponse.status).toBe(201);
    const submitted = (await reportResponse.json()).observation;
    expect(
      (await request(`/api/members/${account.user.id}`, 'DELETE', {}, account.cookie)).status,
    ).toBe(409);
    expect((await request(`/api/members/${member.id}`, 'DELETE', {}, account.cookie)).status).toBe(
      200,
    );
    expect((await request('/api/workspace', 'GET', undefined, cookie)).status).toBe(401);
    expect(
      (await data(account.cookie)).observations.some(
        (item) => item.id === submitted.id && item.authorName === member.name,
      ),
    ).toBe(true);
  });
});

describe('live OneAquaHealth directory boundaries', () => {
  it('uses only its fixed upstream, strips polygons/results, and caches successful responses', async () => {
    let calls = 0;
    let time = currentTime.getTime();
    const load = createCatalogLoader(
      async (input) => {
        calls++;
        expect(input).toBe(ONEAQUAHEALTH_CATALOG_SOURCE);
        return new Response(
          JSON.stringify([
            {
              code: 'C1',
              name: 'Example site',
              city: { name: 'Coimbra' },
              latitude: 40.2,
              longitude: -8.4,
              polygon: 'private geometry',
              health: 'not imported',
            },
          ]),
        );
      },
      () => time,
    );
    const catalog = await load();
    expect(catalog.sites).toEqual([
      { code: 'C1', name: 'Example site', city: 'Coimbra', lat: 40.2, lng: -8.4 },
    ]);
    expect(catalog.source).toBe(ONEAQUAHEALTH_CATALOG_SOURCE);
    await load();
    expect(calls).toBe(1);
    time += 600_001;
    await load();
    expect(calls).toBe(2);
  });
  it('returns 503 when the upstream fails instead of supplying fictional fallback data', async () => {
    app = createApp(db, {
      now: () => currentTime,
      passwordIterations: 100_000,
      catalogLoader: async () => {
        throw new Error('upstream down');
      },
    });
    const account = await demo();
    const response = await request('/api/catalog/oneaquahealth', 'GET', undefined, account.cookie);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('No substitute data');
  });
});
