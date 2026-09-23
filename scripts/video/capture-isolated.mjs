#!/usr/bin/env node
/** Stable, isolated recording runtime: no source edits, no shared data, no watch-triggered API restarts. */
import { createServer } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const apiPort = Number(process.env.RILL_VIDEO_API_PORT || 8793);
const webPort = Number(process.env.RILL_VIDEO_WEB_PORT || 5182);
const origin = `http://127.0.0.1:${webPort}`;
const temporary = await mkdtemp(join(tmpdir(), 'rill-video-'));
const api = spawn(process.execPath, ['--import', 'tsx', 'server/node.ts'], {
  cwd: resolve('.'),
  stdio: ['ignore', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: String(apiPort),
    APP_ORIGIN: origin,
    DATABASE_PATH: join(temporary, 'demo.sqlite'),
    TURSO_DATABASE_URL: '',
    TURSO_AUTH_TOKEN: '',
    REQUIRE_REMOTE_DATABASE: 'false',
  },
});
let web;
async function child(script, args = []) {
  await new Promise((yes, no) => {
    const processChild = spawn(process.execPath, [resolve(script), ...args], {
      stdio: 'inherit',
      env: { ...process.env, RILL_VIDEO_URL: origin },
    });
    processChild.on('error', no);
    processChild.on('exit', (code) =>
      code === 0 ? yes() : no(new Error(`${script} exited with status ${code}`)),
    );
  });
}
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (api.exitCode !== null) throw new Error('The isolated API failed to start.');
    try {
      if ((await fetch(`http://127.0.0.1:${apiPort}/api/health`)).ok) break;
    } catch {}
    if (attempt === 49) throw new Error('Timed out waiting for the isolated API.');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  web = await createServer({
    configFile: resolve('vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: true,
      hmr: false,
      watch: null,
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
  });
  await web.listen();
  console.log(
    `Recording against ${origin}; isolated temporary SQLite database; no server watching.`,
  );
  await child('scripts/video/record-demo.mjs', ['--rehearse']);
  if (!process.argv.includes('--rehearse-only')) {
    await child('scripts/video/record-demo.mjs');
    await child('scripts/video/render-demo.mjs');
  }
} finally {
  await web?.close();
  if (api.exitCode === null) {
    api.kill('SIGTERM');
    await new Promise((resolve) => api.once('exit', resolve));
  }
  await rm(temporary, { recursive: true, force: true });
}
