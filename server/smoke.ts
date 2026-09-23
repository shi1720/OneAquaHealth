/** Run against Node or local Wrangler: RILL_SMOKE_ORIGIN=http://localhost:8791 npx tsx server/smoke.ts */
import assert from 'node:assert/strict';
const origin = process.env.RILL_SMOKE_ORIGIN || 'http://localhost:8787';
async function call(path: string, method = 'GET', body?: unknown, cookie?: string, expected = 200) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(method === 'GET' ? {} : { Origin: origin, 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(value)}`);
  return { value, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const health = await call('/api/health');
const demo = await call('/api/auth/demo', 'POST', {}, undefined, 201);
try {
  const workspace = (await call('/api/workspace', 'GET', undefined, demo.cookie)).value;
  assert.equal(workspace.sites.length, 6);
  assert.equal(workspace.user.isDemo, true);
  const observation = workspace.observations[0];
  await call(
    `/api/observations/${observation.id}/review`,
    'POST',
    { status: 'reviewed', revision: 1, note: 'Local runtime integration review.' },
    demo.cookie,
  );
  await call(
    `/api/observations/${observation.id}/review`,
    'POST',
    { status: 'actioned', revision: 2, note: 'Safe follow-up action recorded in runtime test.' },
    demo.cookie,
  );
  await call(
    `/api/observations/${observation.id}/review`,
    'POST',
    { status: 'resolved', revision: 3, note: 'No recheck evidence should block this.' },
    demo.cookie,
    409,
  );
  const task = (
    await call(
      '/api/tasks',
      'POST',
      {
        observationId: observation.id,
        title: 'Recheck from safe public path',
        kind: 'recheck',
        assignedTo: workspace.user.name,
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        estimatedMinutes: 20,
      },
      demo.cookie,
      201,
    )
  ).value.task;
  await call(
    `/api/tasks/${task.id}`,
    'POST',
    { status: 'completed', result: 'Local integration test: follow-up observation recorded.' },
    demo.cookie,
  );
  await call(
    `/api/observations/${observation.id}/review`,
    'POST',
    {
      status: 'resolved',
      revision: 3,
      note: 'Local runtime test resolution with a completed recheck.',
    },
    demo.cookie,
  );
  const plan = (await call('/api/plan', 'POST', { budgetMinutes: 60 }, demo.cookie)).value;
  assert.ok(plan.usedMinutes <= 60);
  await call('/api/plan/commit', 'POST', { budgetMinutes: 60 }, demo.cookie, 201);
  const fhir = (await call('/api/export?format=fhir', 'GET', undefined, demo.cookie)).value;
  assert.equal(fhir.resourceType, 'Bundle');
  assert.ok(
    fhir.entry.some(
      (item: { resource: { resourceType: string } }) => item.resource.resourceType === 'Task',
    ),
  );
} finally {
  await call('/api/account', 'DELETE', {}, demo.cookie);
}
const email = `runtime-${crypto.randomUUID()}@example.invalid`,
  password = 'temporary runtime validation phrase';
const real = await call(
  '/api/auth/register',
  'POST',
  { name: 'Runtime validation', email, password, workspaceName: 'Disposable runtime validation' },
  undefined,
  201,
);
try {
  const workspace = (await call('/api/workspace', 'GET', undefined, real.cookie)).value;
  assert.equal(workspace.sites.length, 0);
  assert.equal(workspace.observations.length, 0);
  const login = await call('/api/auth/login', 'POST', { email, password });
  assert.equal(login.value.user.email, email);
} finally {
  await call('/api/account', 'DELETE', { password }, real.cookie);
}
console.log(
  `Runtime smoke passed (${health.value.storage}): session, isolated demo, review, evidence gate, task, resolution, exact plan, commit, FHIR, registration, password verification, deletion.`,
);
