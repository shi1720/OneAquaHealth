import { expect, it, vi } from 'vitest';
import { createApp } from '../server/app';
import { SQLiteStorage } from '../server/sqlite';
it('health probes its database and returns a generic failure when storage is unavailable', async () => {
  const db = new SQLiteStorage(':memory:');
  const app = createApp(db);
  try {
    expect((await app.request('http://health.test/api/health')).status).toBe(200);
    vi.spyOn(db, 'get').mockRejectedValueOnce(
      new Error('Private storage endpoint must not reach clients'),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await app.request('http://health.test/api/health');
    expect(failed.status).toBe(500);
    expect((await failed.text()).includes('Private storage')).toBe(false);
  } finally {
    vi.restoreAllMocks();
    db.close();
  }
});
