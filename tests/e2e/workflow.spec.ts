import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const demo = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the live demo' }).click();
  await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
};
// Account setup renders a one-time secret. Explicit demo screenshots remain safe.
test.use({ trace: 'off', screenshot: 'off' });
test('demonstration workspace, plan, report, review, action and recheck', async ({ page }) => {
  const exceptions: string[] = [];
  page.on('pageerror', (e) => exceptions.push(e.message));
  await demo(page);
  await page.screenshot({ path: 'tmp/qa/overview.png', fullPage: true });
  await page.getByRole('button', { name: 'Field planner', exact: true }).click();
  await expect(page.getByText('120 minutes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign this plan' })).toBeEnabled();
  await page.screenshot({ path: 'tmp/qa/planner.png', fullPage: true });
  await page.getByRole('slider', { name: 'Available field time' }).fill('60');
  await expect(page.getByText('60 minutes')).toBeVisible();
  await page.getByRole('button', { name: '2 hours', exact: true }).click();
  await page.getByRole('button', { name: 'Observations', exact: true }).click();
  await page.getByPlaceholder('Search observations, places, people…').fill('foam');
  await page.locator('.observation-row').first().click();
  await expect(page.getByRole('heading', { name: 'Surface foam' })).toBeVisible();
  await page.screenshot({ path: 'tmp/qa/workflow.png', fullPage: true });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New observation', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Riverside playground Fictional small tributary near a family recreation area.',
    })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Litter', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Your field note' })
    .fill('Test observation: bottles on the public bank, safely observed from the path.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Submit observation' }).click();
  await expect(page.getByRole('status')).toContainText('Observation recorded');
  await page.getByPlaceholder('Search observations, places, people…').fill('Test observation');
  await page.locator('.observation-row').click();
  await page.getByRole('button', { name: 'Review & respond' }).click();
  await page
    .getByRole('textbox', { name: 'Coordinator’s decision note' })
    .fill('Reviewed visual evidence. Arrange qualified cleanup coordination.');
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();
  await expect(page.getByRole('button', { name: 'Mark action underway' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Coordinator’s decision note' })
    .fill('Qualified coordinator has arranged a safe response under local procedures.');
  await page.getByRole('button', { name: 'Mark action underway' }).click();
  await expect(page.getByRole('button', { name: 'Resolve after recheck' })).toBeDisabled();
  await page.getByLabel('Type of work').selectOption('recheck');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start task' })).toBeVisible();
  await page.getByRole('button', { name: 'Start task' }).click();
  await page
    .getByRole('textbox', { name: 'What did you find?' })
    .fill(
      'A follow-up observation from the public path found the visible litter had been removed. Water safety remains unknown.',
    );
  await page.getByRole('button', { name: 'Complete task' }).click();
  await page
    .getByRole('textbox', { name: 'Coordinator’s decision note' })
    .fill('Recheck documented visible conditions after the coordinated response.');
  await page.getByRole('button', { name: 'Resolve after recheck' }).click();
  await expect(page.getByRole('heading', { name: 'A documented loop, closed.' })).toBeVisible();
  await page.getByRole('button', { name: 'Decision trail', exact: true }).click();
  await expect(
    page.getByText('Recheck documented visible conditions after the coordinated response.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(exceptions).toEqual([]);
});
test('real registration starts empty, site setup and password login persist', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.org`;
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create a workspace', exact: true }).click();
    await page.getByLabel('Your name').fill('Test Coordinator');
    await page.getByLabel('Workspace name').fill('Test River Team');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('River-tested-passphrase-2026');
    await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Save your recovery key.' })).toBeVisible();
    await page.getByLabel('I have saved this recovery key safely.').check();
    await page.getByRole('button', { name: 'Continue to workspace' }).click();
    await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
    await page.getByRole('button', { name: 'Team & settings' }).click();
    await page.getByRole('button', { name: 'Add a site', exact: true }).click();
    await page.getByLabel('Site name').fill('Test public bridge');
    await page.getByLabel('Catchment', { exact: true }).fill('Test Catchment');
    await page.getByLabel('Site description').fill('A public bridge over the test stream.');
    await page.getByLabel('Latitude').fill('51.5');
    await page.getByLabel('Longitude').fill('-0.12');
    await page.getByLabel('Habitat', { exact: true }).fill('Urban stream');
    await page
      .getByLabel('Safe access instructions')
      .fill('Observe from the public bridge. Do not enter the water.');
    await page.getByRole('button', { name: 'Add site', exact: true }).click();
    await expect(page.getByText('Test public bridge', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('River-tested-passphrase-2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
    await page.getByRole('button', { name: 'Team & settings' }).click();
    await expect(page.getByText('Test public bridge', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete this workspace' }).click();
    await page.getByLabel('Your password').fill('River-tested-passphrase-2026');
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.getByRole('button', { name: 'Explore the live demo' })).toBeVisible();
  } finally {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/');
  }
});
test('mobile navigation and form fit, draft survives closing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  await page.screenshot({ path: 'tmp/qa/mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Observations', exact: true }).click();
  await page.getByRole('button', { name: 'New observation', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Surface foam', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Your field note' })
    .fill('Draft should survive closing this dialog.');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New observation', exact: true }).click();
  await expect(page.getByText(/Your last draft was restored/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your field note' })).toHaveValue(
    'Draft should survive closing this dialog.',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
test('keyboard access and automated accessibility scan', async ({ page }) => {
  await demo(page);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  await test.info().attach('accessibility.json', {
    body: JSON.stringify(result.violations, null, 2),
    contentType: 'application/json',
  });
  mkdirSync('tmp/qa', { recursive: true });
  writeFileSync('tmp/qa/axe.json', JSON.stringify(result.violations, null, 2));
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, message: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'New observation', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'New observation', exact: true })).toBeFocused();
});

test('a recheck completed before action cannot enable resolution in the interface', async ({
  page,
}) => {
  await demo(page);
  const origin = new URL(page.url()).origin;
  const workspace = await (await page.request.get('/api/workspace')).json();
  const observation = workspace.observations[0];
  const mutation = async (path: string, data: unknown) => {
    const response = await page.request.post(`/api${path}`, { headers: { Origin: origin }, data });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const { task } = await mutation('/tasks', {
    observationId: observation.id,
    title: 'Earlier synthetic verification for chronology check',
    kind: 'recheck',
    assignedTo: workspace.user.id,
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    estimatedMinutes: 20,
  });
  await mutation(`/tasks/${task.id}`, { status: 'in_progress' });
  await mutation(`/tasks/${task.id}`, {
    status: 'completed',
    result: 'This synthetic check was recorded before the later response began.',
  });
  await mutation(`/observations/${observation.id}/review`, {
    status: 'reviewed',
    note: 'Synthetic case reviewed with its uncertainty retained.',
    revision: 1,
  });
  await mutation(`/observations/${observation.id}/review`, {
    status: 'actioned',
    note: 'The later response is now recorded as underway.',
    revision: 2,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Observations', exact: true }).click();
  await page.getByPlaceholder('Search observations, places, people…').fill(observation.notes);
  await page.locator('.observation-row').click();
  await page.getByRole('button', { name: 'Review & respond' }).click();
  await page
    .getByRole('textbox', { name: 'Coordinator’s decision note' })
    .fill('A valid note alone cannot turn an earlier recheck into evidence after action.');
  await expect(page.getByRole('button', { name: 'Resolve after recheck' })).toBeDisabled();
  await expect(
    page.getByText(
      'Complete a recheck task after action began, with a recorded result, to enable resolution.',
    ),
  ).toBeVisible();
});
