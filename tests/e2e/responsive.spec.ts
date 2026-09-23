import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Synthetic account sessions and drafts need no retained traces or screenshots.
test.use({ trace: 'off', screenshot: 'off' });

async function demo(page: Page) {
  await page.goto('/');
  const origin = new URL(page.url()).origin;
  const response = await page.request.post('/api/auth/demo', {
    headers: { Origin: origin },
    data: {},
  });
  expect(response.status()).toBe(201);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
  return origin;
}
async function cleanup(page: Page, origin: string) {
  await page.unrouteAll({ behavior: 'wait' });
  await page.request.delete('/api/account', { headers: { Origin: origin }, data: {} });
}

test('mobile navigation is inaccessible while closed, traps focus while open and restores it on dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const origin = await demo(page);
  try {
    const sidebar = page.locator('.sidebar'),
      trigger = page.getByRole('button', { name: 'Open navigation' });
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
    await expect(page.locator('.main-shell')).toHaveAttribute('inert', '');
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(sidebar).toHaveAttribute('inert', '');
    await trigger.click();
    await page.getByRole('button', { name: 'A quick field guide' }).click();
    await expect(
      page.getByRole('dialog', { name: 'A few minutes. A useful observation.' }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.setViewportSize({ width: 390, height: 360 });
    await trigger.click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).scrollIntoViewIfNeeded();
    const signout = await page.getByRole('button', { name: 'Sign out', exact: true }).boundingBox();
    expect(signout!.y + signout!.height <= 360).toBe(true);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(sidebar).not.toHaveAttribute('inert', '');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/auth/logout', (route) => route.fulfill({ json: { ok: true } }));
    await trigger.click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Explore the live demo' })).toBeVisible();
    expect(await page.locator('body').evaluate((el) => el.style.overflow)).not.toBe('hidden');
  } finally {
    await cleanup(page, origin);
  }
});

test('a failed budget refresh clears the old plan and requires a successful retry before assignment', async ({
  page,
}) => {
  const origin = await demo(page);
  try {
    await page.getByRole('button', { name: 'Field planner', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Assign this plan' })).toBeEnabled();
    await page.route('**/api/plan', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Planning service temporarily unavailable for this test.' }),
      }),
    );
    await page.getByRole('button', { name: '1 hour', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Planning service temporarily unavailable');
    await expect(page.locator('.plan-item')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign this plan' })).toHaveCount(0);
    await expect(page.getByText(/min left as a buffer/)).toHaveCount(0);
    await page.unroute('**/api/plan');
    await page.getByRole('button', { name: 'Retry field plan' }).click();
    await expect(page.getByText('of 60 available')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign this plan' })).toBeEnabled();
    await expect(page.getByRole('button', { name: '1 hour', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.route('**/api/plan/commit', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'The available work changed during this test.' }),
      }),
    );
    await page.getByRole('button', { name: 'Assign this plan' }).click();
    await expect(page.getByRole('alert')).toContainText('available work changed');
    await expect(page.getByRole('button', { name: 'Assign this plan' })).toHaveCount(0);
    await page.unroute('**/api/plan/commit');
    await page.getByRole('button', { name: 'Retry field plan' }).click();
    await expect(page.getByRole('button', { name: 'Assign this plan' })).toBeEnabled();
  } finally {
    await cleanup(page, origin);
  }
});

test('workspace refresh reports a failure without a false success notification', async ({
  page,
}) => {
  const origin = await demo(page);
  try {
    await page.route('**/api/workspace', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary workspace failure for QA.' }),
      }),
    );
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(page.getByRole('alert')).toContainText('Temporary workspace failure');
    await expect(page.getByText('Workspace refreshed.', { exact: true })).toHaveCount(0);
    await page.unroute('**/api/workspace');
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(page.getByRole('status')).toContainText('Workspace refreshed.');
    await expect(page.getByText('Temporary workspace failure for QA.')).toHaveCount(0);
  } finally {
    await cleanup(page, origin);
  }
});

test('an empty selected site opens at that site; access instructions and invalid draft dates are handled', async ({
  page,
}) => {
  const origin = await demo(page);
  try {
    const workspace = await (await page.request.get('/api/workspace')).json();
    const site = workspace.sites[1];
    site.sensitive = true;
    site.access = 'QA restricted bank: observe from the authorised public bridge only.';
    workspace.observations = workspace.observations.filter(
      (o: { siteId: string }) => o.siteId !== site.id,
    );
    workspace.assessments = workspace.assessments.filter((a: { observationId: string }) =>
      workspace.observations.some((o: { id: string }) => o.id === a.observationId),
    );
    await page.route('**/api/workspace', (route) => route.fulfill({ json: workspace }));
    await page.reload();
    await page.getByRole('button', { name: `Select ${site.name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Observe this site' }).click();
    await expect(page.locator('.site-choice').filter({ hasText: site.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Restricted or sensitive site.')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/QA restricted bank/)).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.evaluate(
      ({ userId, siteId }) =>
        localStorage.setItem(
          `rill-draft-${userId}`,
          JSON.stringify({
            savedAt: Date.now(),
            form: {
              siteId,
              observedAt: 'corrupt date',
              concerns: [],
              clarity: 'unsure',
              flow: 'unsure',
              confidence: 'unsure',
              notes: 'Preserved test note',
              clientId: crypto.randomUUID(),
            },
          }),
        ),
      { userId: workspace.user.id, siteId: site.id },
    );
    await page.getByRole('button', { name: 'New observation', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Where are you observing?' })).toBeVisible();
    await page.getByLabel('When did you observe it?').fill('2035-01-01T12:00');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('within the last year');
    await expect(page.getByRole('heading', { name: 'Where are you observing?' })).toBeVisible();
  } finally {
    await cleanup(page, origin);
  }
});

test('impact measures count only rechecks completed after action began', async ({ page }) => {
  const origin = await demo(page);
  try {
    const workspace = await (await page.request.get('/api/workspace')).json();
    const observation = workspace.observations[0];
    observation.status = 'actioned';
    observation.actionedAt = '2026-09-23T11:00:00.000Z';
    workspace.tasks = [
      {
        id: 'before-action',
        observationId: observation.id,
        siteId: observation.siteId,
        title: 'Earlier QA recheck',
        kind: 'recheck',
        status: 'completed',
        assignedTo: 'Synthetic QA',
        dueAt: '2026-09-23T10:00:00.000Z',
        createdAt: '2026-09-23T09:00:00.000Z',
        completedAt: '2026-09-23T10:00:00.000Z',
        estimatedMinutes: 20,
        result: 'Earlier than action, not follow-up evidence.',
      },
      {
        id: 'after-action',
        observationId: observation.id,
        siteId: observation.siteId,
        title: 'Later QA recheck',
        kind: 'recheck',
        status: 'completed',
        assignedTo: 'Synthetic QA',
        dueAt: '2026-09-23T12:00:00.000Z',
        createdAt: '2026-09-23T11:00:00.000Z',
        completedAt: '2026-09-23T12:00:00.000Z',
        estimatedMinutes: 20,
        result: 'Recorded after action began.',
      },
    ];
    await page.route('**/api/workspace', (route) => route.fulfill({ json: workspace }));
    await page.reload();
    await page.getByRole('button', { name: 'Impact & evidence', exact: true }).click();
    await expect(
      page
        .locator('.progress-metrics > div')
        .filter({ hasText: 'Follow-up rechecks' })
        .locator('strong'),
    ).toHaveText('1');
    await expect(
      page
        .locator('.progress-metrics > div')
        .filter({ hasText: 'Field tasks completed' })
        .locator('strong'),
    ).toHaveText('2');
  } finally {
    await cleanup(page, origin);
  }
});

test('main pages remain accessible without horizontal overflow on narrow phones, tablets and desktop', async ({
  page,
}) => {
  const origin = await demo(page);
  try {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const name of [
        'Catchment overview',
        'Observations',
        'Field planner',
        'Impact & evidence',
        'Team & settings',
      ]) {
        if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click();
        await page.getByRole('button', { name, exact: true }).first().click();
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${name} at ${width}px`,
        ).toBe(true);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(
          results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          `${name} at ${width}px`,
        ).toEqual([]);
      }
    }
  } finally {
    await cleanup(page, origin);
  }
});

test('export errors stay in the workspace and a retry produces a labelled synthetic file', async ({
  page,
}) => {
  const origin = await demo(page);
  try {
    await page.getByRole('button', { name: 'Impact & evidence', exact: true }).click();
    await page.getByRole('button', { name: 'Data & interoperability' }).click();
    await page.route('**/api/export?format=json', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Export temporarily unavailable for QA.' }),
      }),
    );
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Export temporarily unavailable');
    await expect(
      page.getByRole('heading', { name: 'Follow-through makes the difference.' }),
    ).toBeVisible();
    await page.unroute('**/api/export?format=json');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^rill-synthetic-demo-.*\.json$/);
    expect(await download.failure()).toBeNull();
    const { readFile } = await import('node:fs/promises');
    const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(data.workspace.demo).toBe(true);
    expect(data.dataLabel).toContain('SYNTHETIC');
    await expect(page.getByRole('status')).toContainText('Download started.');
  } finally {
    await cleanup(page, origin);
  }
});

test('rapid sequential typing keeps the draft without a React update-depth error', async ({
  page,
}) => {
  const origin = await demo(page),
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const note =
    'Synthetic rapid-entry QA: bottles and wrappers were visible from the public footpath. This is a software regression exercise, not an environmental observation. No water entry or materials handling occurred.';
  try {
    await page.getByRole('button', { name: 'New observation', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Litter', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Your field note' })
      .pressSequentially(note, { delay: 0 });
    await expect(page.getByRole('textbox', { name: 'Your field note' })).toHaveValue(note);
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'New observation', exact: true }).click();
    await expect(page.getByText(/Your last draft was restored/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Your field note' })).toHaveValue(note);
    expect(errors).toEqual([]);
  } finally {
    await cleanup(page, origin);
  }
});
