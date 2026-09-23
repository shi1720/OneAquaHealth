import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const initialPassword = 'Rill-settings-test-passphrase-2026';
const siteInput = {
  name: 'QA public bridge',
  catchment: 'QA catchment',
  lat: 51.5,
  lng: -0.12,
  description: 'A fictional site for isolated software testing.',
  habitat: 'Urban stream',
  access: 'Software test only. No field visit is authorised.',
  exposure: 2,
  walkMinutes: 15,
  sensitive: true,
};
async function account(page: Page) {
  await page.goto('/');
  const origin = new URL(page.url()).origin;
  const email = `settings-e2e-${crypto.randomUUID()}@example.test`;
  const response = await page.request.post('/api/auth/register', {
    headers: { Origin: origin },
    data: {
      name: 'Settings QA coordinator',
      workspaceName: 'Disposable settings QA',
      email,
      password: initialPassword,
    },
  });
  expect(response.status()).toBe(201);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
  return {
    email,
    origin,
    password: initialPassword,
    cleanup: async (password: string) => {
      await page.request.delete('/api/account', {
        headers: { Origin: origin },
        data: { password },
      });
    },
  };
}
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Team & settings', exact: true }).click();
}
async function upload(page: Page, filename: string, content: unknown) {
  await page.getByLabel('Observation import file').setInputFiles({
    name: filename,
    mimeType: filename.endsWith('.csv') ? 'text/csv' : 'application/json',
    buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)),
  });
}

test('coordinator edits sites, manages volunteer access, and rotates the account passphrase', async ({
  page,
  request,
}) => {
  const user = await account(page),
    origin = user.origin;
  try {
    const created = await page.request.post('/api/sites', {
      headers: { Origin: origin },
      data: siteInput,
    });
    expect(created.status()).toBe(201);
    await page.reload();
    await settings(page);
    await page.getByRole('button', { name: 'Edit QA public bridge', exact: true }).click();
    await page.getByLabel('Site name', { exact: true }).fill('QA bridge with reviewed access');
    await page
      .getByLabel('Safe access instructions')
      .fill('Observe from the public footpath after coordinator approval. Stay out of the water.');
    await page.getByRole('button', { name: 'Save site changes' }).click();
    await expect(
      page.getByRole('button', { name: 'Edit QA bridge with reviewed access' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add a volunteer', exact: true }).click();
    await page.getByLabel('Full name').fill('QA volunteer');
    await page
      .getByLabel('Email', { exact: true })
      .fill(`volunteer-${crypto.randomUUID()}@example.test`);
    await page.getByLabel('Initial passphrase').fill('Volunteer initial passphrase 123!');
    await page.getByRole('button', { name: 'Create volunteer account' }).click();
    await expect(
      page.getByRole('button', { name: 'Remove QA volunteer', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Remove QA volunteer', exact: true }).click();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Remove access', exact: true }),
    ).toBeDisabled();
    await page.getByLabel('Type REMOVE to confirm').fill('REMOVE');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Remove access', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Remove QA volunteer', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Change passphrase', exact: true }).click();
    await page.getByLabel('Current passphrase', { exact: true }).fill(initialPassword);
    await page
      .getByLabel('New passphrase', { exact: true })
      .fill('Updated test passphrase with mismatch');
    await page
      .getByLabel('Repeat new passphrase', { exact: true })
      .fill('Different test passphrase here');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Change passphrase', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText('do not match');
    user.password = 'Updated coordinator passphrase 2026!';
    await page.getByLabel('New passphrase', { exact: true }).fill(user.password);
    await page.getByLabel('Repeat new passphrase', { exact: true }).fill(user.password);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Change passphrase', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await page.request.get('/api/auth/me')).status()).toBe(200);
    expect(
      (
        await request.post('/api/auth/login', {
          headers: { Origin: origin },
          data: { email: user.email, password: initialPassword },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post('/api/auth/login', {
          headers: { Origin: origin },
          data: { email: user.email, password: user.password },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await user.cleanup(user.password);
  }
});

test('import requires explicit site matching, skips repeat records, and blocks synthetic evidence in a real workspace', async ({
  page,
}) => {
  const user = await account(page),
    origin = user.origin;
  try {
    expect(
      (
        await page.request.post('/api/sites', { headers: { Origin: origin }, data: siteInput })
      ).status(),
    ).toBe(201);
    await page.reload();
    await settings(page);
    const csv =
      'observation_id,site_id,observed_at,concerns,clarity,flow,observer_confidence,notes,data_label\r\nexternal-record,external-bank,' +
      new Date().toISOString() +
      ',litter,unsure,steady,unsure,"Software test note, with a comma and ""quoted text"".",user reported';
    await page.getByRole('button', { name: 'Import observations', exact: true }).click();
    await upload(page, 'compatible.csv', csv);
    await expect(page.getByRole('button', { name: 'Import 1 record', exact: true })).toBeDisabled();
    await page
      .getByLabel('Destination for external-bank')
      .selectOption({ label: 'QA public bridge · QA catchment' });
    await expect(page.getByRole('button', { name: 'Import 1 record', exact: true })).toBeEnabled();
    await expect(page.locator('.modal')).toHaveCSS('opacity', '1');
    await expect(page.locator('.modal-backdrop')).toHaveCSS('opacity', '1');
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page })
      .include('.modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole('button', { name: 'Import 1 record', exact: true }).click();
    await expect(page.getByRole('heading', { name: '1 observation imported' })).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Import observations', exact: true }).click();
    await upload(page, 'compatible.csv', csv);
    await page
      .getByLabel('Destination for external-bank')
      .selectOption({ label: 'QA public bridge · QA catchment' });
    await page.getByRole('button', { name: 'Import 1 record', exact: true }).click();
    await expect(page.getByRole('heading', { name: '0 observations imported' })).toBeVisible();
    await expect(page.locator('.import-success')).toContainText('1 previously imported record');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Import observations', exact: true }).click();
    await upload(page, 'synthetic.json', [
      {
        siteId: 'external-bank',
        observedAt: new Date().toISOString(),
        concerns: ['litter'],
        clarity: 'unsure',
        flow: 'steady',
        confidence: 'unsure',
        notes: 'Synthetic demonstration only.',
        demo: true,
      },
    ]);
    await page
      .getByLabel('Destination for external-bank')
      .selectOption({ label: 'QA public bridge · QA catchment' });
    await expect(page.getByRole('alert')).toContainText('cannot be added to this real workspace');
    await expect(page.getByRole('button', { name: 'Import 1 record', exact: true })).toBeDisabled();
    const workspace = await (await page.request.get('/api/workspace')).json();
    expect(workspace.observations).toHaveLength(1);
    expect(workspace.observations[0].authorName).toBe('Settings QA coordinator');
    expect(workspace.observations[0].notes).toBe(
      'Software test note, with a comma and "quoted text".',
    );
  } finally {
    await user.cleanup(user.password);
  }
});

test('catalog failures stay explicit, search filters a deterministic fixture, and new site access starts restricted', async ({
  page,
}) => {
  const user = await account(page),
    origin = user.origin;
  let available = false;
  try {
    await page.route('**/api/catalog/oneaquahealth', (route) =>
      available
        ? route.fulfill({
            json: {
              source: 'https://api.enora-oah.eu/api/sites/all',
              retrievedAt: '2026-09-23T10:00:00Z',
              notice: 'Deterministic test fixture. No access permissions established.',
              sites: [
                {
                  code: 'TEST-C',
                  name: 'Catalog test stream',
                  city: 'Coimbra',
                  lat: 40.2,
                  lng: -8.4,
                },
                { code: 'TEST-O', name: 'Oslo test stream', city: 'Oslo', lat: 59.9, lng: 10.7 },
              ],
            },
          })
        : route.fulfill({
            status: 503,
            json: {
              error:
                'The live OneAquaHealth site directory is unavailable. No substitute data was used.',
            },
          }),
    );
    await settings(page);
    await page.getByRole('button', { name: 'Explore OneAquaHealth sites', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No substitute data was used');
    expect(await page.locator('.catalog-row').count()).toBe(0);
    available = true;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.locator('.catalog-row')).toHaveCount(2);
    await page.getByLabel('Filter directory by city').selectOption('Coimbra');
    await page.getByLabel('Search directory sites').fill('Catalog test');
    await expect(page.locator('.catalog-row')).toHaveCount(1);
    await page.getByRole('button', { name: /Catalog test stream/ }).click();
    await expect(page.getByLabel('Latitude')).toHaveValue('40.2');
    await expect(
      page.getByLabel('Restricted, sensitive, or access unverified. Exclude from volunteer plans.'),
    ).toBeChecked();
    await expect(
      page.getByLabel('Restricted, sensitive, or access unverified. Exclude from volunteer plans.'),
    ).toBeDisabled();
    await page.getByLabel('Habitat', { exact: true }).fill('Test habitat supplied by coordinator');
    await page
      .getByLabel('Safe access instructions')
      .fill('Unverified access: no volunteers may be dispatched. Test site only.');
    await page.getByRole('button', { name: 'Add site', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const workspace = await (await page.request.get('/api/workspace')).json();
    expect(workspace.sites).toHaveLength(1);
    expect(workspace.sites[0].sensitive).toBe(true);
    expect(workspace.sites[0].name).toBe('Catalog test stream');
  } finally {
    await user.cleanup(user.password);
  }
});
