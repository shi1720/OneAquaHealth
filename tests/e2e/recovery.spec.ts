import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// These flows render a secret once. Never record unmasked screenshots or traces.
test.use({ screenshot: 'off', trace: 'off' });

test('signup saves an offline key; recovery revokes sessions and replaces the one-time key', async ({
  page,
  browser,
}) => {
  const initial = 'A safe initial recovery passphrase 2026!',
    replacement = 'A new recovered passphrase for QA 2026!';
  const email = `recovery-e2e-${crypto.randomUUID()}@example.test`;
  let currentPassword = initial;
  await page.goto('/');
  const origin = new URL(page.url()).origin;
  try {
    await page.getByRole('button', { name: 'Create a workspace', exact: true }).click();
    await page.getByLabel('Your name').fill('Offline recovery QA');
    await page.getByLabel('Workspace name').fill('Disposable recovery QA');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(initial);
    await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Save your recovery key.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to workspace' })).toBeDisabled();
    const firstKey = await page
      .getByRole('textbox', { name: 'Recovery key', exact: true })
      .inputValue();
    expect(firstKey.startsWith('RILL-')).toBe(true);
    expect(
      await page.evaluate(
        (secret) =>
          [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
            value.includes(secret),
          ),
        firstKey,
      ),
    ).toBe(false);
    await page.evaluate(() => document.fonts.ready);
    expect(
      (
        await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.screenshot({
      path: 'tmp/qa/recovery-key-desktop-masked.png',
      fullPage: true,
      mask: [page.getByRole('textbox', { name: 'Recovery key', exact: true })],
      maskColor: '#dce5cf',
    });
    await page.getByLabel('I have saved this recovery key safely.').check();
    await page.getByRole('button', { name: 'Continue to workspace' }).click();
    await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
    const earlier = await browser.newContext();
    expect(
      (
        await earlier.request.post(origin + '/api/auth/login', {
          headers: { Origin: origin },
          data: { email, password: initial },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Forgot your passphrase?', exact: true }).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Recovery key', { exact: true }).fill(firstKey);
    await page.getByLabel('New passphrase', { exact: true }).fill(replacement);
    await page.getByLabel('Repeat new passphrase', { exact: true }).fill(replacement);
    await page.getByRole('button', { name: 'Restore account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Save your replacement key.' })).toBeVisible();
    currentPassword = replacement;
    const nextKey = await page
      .getByRole('textbox', { name: 'Recovery key', exact: true })
      .inputValue();
    expect(nextKey === firstKey).toBe(false);
    expect((await earlier.request.get(origin + '/api/auth/me')).status()).toBe(401);
    await earlier.close();
    expect(
      (
        await page.request.post('/api/auth/recover', {
          headers: { Origin: origin },
          data: { email, recoveryKey: firstKey, newPassword: initial },
        })
      ).status(),
    ).toBe(401);
    expect(
      await page.evaluate(
        (secret) =>
          [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
            value.includes(secret),
          ),
        nextKey,
      ),
    ).toBe(false);
    await page.getByLabel('I have saved this recovery key safely.').check();
    await page.getByRole('button', { name: 'Continue to workspace' }).click();
    await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
  } finally {
    page.on('dialog', (dialog) => dialog.accept());
    await page.request.delete('/api/account', {
      headers: { Origin: origin },
      data: { password: currentPassword },
    });
    await page.goto('/');
  }
});

test('existing account creates a recovery key after password confirmation with accessible mobile controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const origin = new URL(page.url()).origin;
  const password = 'Existing user offline recovery passphrase!';
  const email = `rotate-e2e-${crypto.randomUUID()}@example.test`;
  const registration = await page.request.post('/api/auth/register', {
    headers: { Origin: origin },
    data: {
      name: 'Existing recovery QA',
      workspaceName: 'Disposable mobile recovery',
      email,
      password,
    },
  });
  expect(registration.status()).toBe(201);
  const account = await registration.json();
  try {
    await page.reload();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Team & settings', exact: true }).click();
    await page.getByRole('button', { name: 'Recovery key', exact: true }).click();
    await page.getByLabel('Current passphrase', { exact: true }).fill('wrong');
    await page.getByRole('button', { name: 'Generate new recovery key' }).click();
    await expect(page.getByRole('alert')).toContainText('incorrect');
    await page.getByLabel('Current passphrase', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Generate new recovery key' }).click();
    await expect(page.getByRole('heading', { name: 'Save your replacement key.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeDisabled();
    const nextKey = await page.getByRole('textbox', { name: 'Recovery key' }).inputValue();
    expect(nextKey === account.recoveryKey).toBe(false);
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Save your replacement key.' })).toBeVisible();
    await page.locator('.modal-backdrop').click({ position: { x: 2, y: 2 } });
    await expect(page.getByRole('heading', { name: 'Save your replacement key.' })).toBeVisible();
    await expect(page.locator('.modal')).toHaveCSS('opacity', '1');
    await expect(page.locator('.modal-backdrop')).toHaveCSS('opacity', '1');
    expect(
      (
        await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator('.modal').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'tmp/qa/recovery-key-mobile-masked.png',
      mask: [page.getByRole('textbox', { name: 'Recovery key', exact: true })],
      maskColor: '#dce5cf',
    });
    await page.getByLabel('I have saved this recovery key safely.').check();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Recovery key' })).toHaveCount(0);
    expect(
      (
        await page.request.post('/api/auth/recover', {
          headers: { Origin: origin },
          data: { email, recoveryKey: account.recoveryKey, newPassword: password },
        })
      ).status(),
    ).toBe(401);
  } finally {
    page.on('dialog', (dialog) => dialog.accept());
    await page.request.delete('/api/account', { headers: { Origin: origin }, data: { password } });
    await page.goto('/');
  }
});
