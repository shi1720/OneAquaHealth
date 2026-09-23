#!/usr/bin/env node
/** Add a user-recorded narration. No voice synthesis or impersonation is performed. */
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const audioFile = process.argv[2];
if (!audioFile || !existsSync(audioFile))
  throw new Error(
    'Usage: node scripts/video/add-voiceover.mjs /absolute/path/to/your-narration.wav [--captioned]',
  );
const root = resolve('output/video');
const source = join(
  root,
  process.argv.includes('--captioned') ? 'rill-demo-captioned.mp4' : 'rill-demo-clean.mp4',
);
const destination = join(root, 'rill-demo-final-with-narration.mp4');
if (existsSync(destination))
  throw new Error(
    'The final narrated file already exists. Rename or move it before creating another version.',
  );
const ffmpeg =
  process.env.RILL_FFMPEG ||
  (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const ffprobe =
  process.env.RILL_FFPROBE ||
  (existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe');
function probe(file) {
  const result = spawnSync(
    ffprobe,
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}
const narration = probe(resolve(audioFile));
if (!narration.streams.some((stream) => stream.codec_type === 'audio'))
  throw new Error('The supplied file contains no audio stream.');
const videoSeconds = Number(probe(source).format.duration),
  audioSeconds = Number(narration.format.duration);
const duration = Math.max(videoSeconds, audioSeconds);
if (!Number.isFinite(duration) || duration > 300)
  throw new Error(
    'Narration must fit within the hackathon five-minute limit. Use the timed script or trim your audio before trying again.',
  );
const args = [
  '-hide_banner',
  '-loglevel',
  'warning',
  '-n',
  '-i',
  source,
  '-i',
  resolve(audioFile),
  '-map',
  '0:v:0',
  '-map',
  '1:a:0',
  '-map',
  '0:s?',
  '-af',
  'loudnorm=I=-16:TP=-1.5:LRA=11,apad',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-c:s',
  'copy',
  '-t',
  String(duration),
];
if (duration > videoSeconds)
  args.push(
    '-vf',
    `tpad=stop_mode=clone:stop_duration=${duration - videoSeconds}`,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '19',
    '-pix_fmt',
    'yuv420p',
  );
else args.push('-c:v', 'copy');
args.push('-movflags', '+faststart', destination);
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`FFmpeg exited with status ${result.status}`);
console.log(
  `Narrated video created: ${destination}\nDuration: ${duration.toFixed(2)} seconds. Review synchronization before submission.`,
);
