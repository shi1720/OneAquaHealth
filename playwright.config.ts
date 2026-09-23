import { defineConfig } from '@playwright/test';

// Playwright's automatic failure DOM can include one-time recovery keys.
// Keep source diagnostics, but omit its copy-prompt/page-snapshot attachment.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

const externalTarget = process.env.RILL_E2E_URL;
const baseURL = externalTarget || 'http://localhost:8790';
// Each local run owns a fresh database; repeated QA must not consume the
// development workspace's auth limits or depend on its mutable records.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: externalTarget
    ? undefined
    : {
        command: 'NODE_ENV=production npm run build && npm start',
        url: `${baseURL}/api/health`,
        timeout: 120000,
        reuseExistingServer: false,
        env: {
          PORT: '8790',
          HOST: '127.0.0.1',
          APP_ORIGIN: baseURL,
          NODE_ENV: 'development',
          REQUIRE_REMOTE_DATABASE: 'false',
          TURSO_DATABASE_URL: '',
          TURSO_AUTH_TOKEN: '',
          DATABASE_PATH: `tmp/e2e/rill-${Date.now()}-${process.pid}.sqlite`,
        },
      },
});
