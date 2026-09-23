#!/usr/bin/env node
/** Encode the recorded application; captions are rendered in a separate band and never hide UI. */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = resolve('output/video');
const metadata = JSON.parse(await readFile(join(output, 'timing.json'), 'utf8'));
const assets = join(output, 'caption-assets');
await mkdir(assets, { recursive: true });
const ffmpeg =
  process.env.RILL_FFMPEG ||
  (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const ffprobe =
  process.env.RILL_FFPROBE ||
  (existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe');
function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${binary} exited with status ${result.status}`);
}
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1744, height: 112 },
  deviceScaleFactor: 1,
});
const manifest = ['ffconcat version 1.0'];
for (const [index, scene] of metadata.captions.entries()) {
  const filename = `caption-${String(index + 1).padStart(2, '0')}.png`;
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1744px;height:112px;background:#173d31;color:#f4f5e9;font-family:Arial,sans-serif;text-align:center;padding:4px 20px}.title{font-size:13px;line-height:20px;font-weight:700;letter-spacing:2.4px;color:#d2e49d;margin-bottom:4px}.caption{font-size:26px;line-height:33px;letter-spacing:-.2px}</style></head><body><div class="title">${escape(scene.title)}</div><div class="caption">${escape(scene.caption).replaceAll('\n', '<br>')}</div></body></html>`,
  );
  await page.screenshot({ path: join(assets, filename) });
  manifest.push(`file '${filename}'`, `duration ${scene.end - scene.start}`);
}
manifest.push(`file 'caption-${String(metadata.captions.length).padStart(2, '0')}.png'`);
await browser.close();
await writeFile(join(assets, 'captions.ffconcat'), manifest.join('\n') + '\n');
const clean = join(output, 'rill-demo-clean.mp4');
const captioned = join(output, 'rill-demo-captioned.mp4');
console.log('Encoding clean 1080p recording with optional soft captions…');
run(ffmpeg, [
  '-hide_banner',
  '-loglevel',
  'warning',
  '-y',
  '-ss',
  String(metadata.videoLeadSeconds),
  '-i',
  metadata.rawPath,
  '-i',
  join(output, 'rill-demo-captions.srt'),
  '-t',
  String(metadata.durationSeconds),
  '-map',
  '0:v:0',
  '-map',
  '1:0',
  '-vf',
  'scale=1728:1080:flags=lanczos,pad=1920:1080:96:0:color=0x173d31',
  '-r',
  '25',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '19',
  '-pix_fmt',
  'yuv420p',
  '-c:s',
  'mov_text',
  '-metadata:s:s:0',
  'language=eng',
  '-disposition:s:0',
  '0',
  '-an',
  '-movflags',
  '+faststart',
  clean,
]);
console.log('Encoding captioned 1080p recording; the caption band sits below the interface…');
run(ffmpeg, [
  '-hide_banner',
  '-loglevel',
  'warning',
  '-y',
  '-ss',
  String(metadata.videoLeadSeconds),
  '-i',
  metadata.rawPath,
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  join(assets, 'captions.ffconcat'),
  '-t',
  String(metadata.durationSeconds),
  '-filter_complex',
  '[0:v]scale=1536:960:flags=lanczos,pad=1920:1080:192:0:color=0x173d31[app];[1:v]fps=25[cap];[app][cap]overlay=88:966:shortest=1[out]',
  '-map',
  '[out]',
  '-r',
  '25',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '19',
  '-pix_fmt',
  'yuv420p',
  '-an',
  '-movflags',
  '+faststart',
  captioned,
]);
const probe = spawnSync(
  ffprobe,
  [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size:stream=codec_name,width,height,r_frame_rate',
    '-of',
    'json',
    captioned,
  ],
  { encoding: 'utf8' },
);
if (probe.status !== 0) throw new Error(probe.stderr);
await writeFile(join(output, 'media-inspection.json'), probe.stdout);
for (const [name, seconds] of [
  ['landing', 8],
  ['observation', 50],
  ['reasons', 85],
  ['planner', 122],
  ['recheck', 175],
  ['resolved', 188],
  ['export', 209],
  ['end-card', 232],
]) {
  run(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(seconds),
    '-i',
    captioned,
    '-frames:v',
    '1',
    join(output, 'frames', `final-${name}.png`),
  ]);
}
console.log(
  JSON.stringify(
    {
      clean,
      captioned,
      duration: metadata.durationSeconds,
      resolution: '1920×1080',
      audio: 'none',
      captions: join(output, 'rill-demo-captions.srt'),
    },
    null,
    2,
  ),
);
