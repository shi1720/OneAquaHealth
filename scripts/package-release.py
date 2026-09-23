"""Build a compact submission kit from explicit public assets and runnable source.

The only video permitted in the archive is the final narrated MP4. Databases,
raw audio, credentials, scratch captures and dependencies are never included.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--version', default='1.1.0')
parser.add_argument('--video', default='output/video/rill-demo-narrated.mp4')
parser.add_argument('--max-bytes', type=int, default=35_000_000)
parser.add_argument('--output')
args = parser.parse_args()
if not all(part.isdigit() for part in args.version.split('.')) or len(args.version.split('.')) != 3:
    raise SystemExit('Version must use numeric major.minor.patch syntax.')
video = (root / args.video).resolve()
if video.parent != root / 'output/video' or video.suffix != '.mp4' or video.is_symlink():
    raise SystemExit('The narrated video must be an MP4 directly under output/video.')
if video.name in {'rill-demo-clean.mp4', 'rill-demo-captioned.mp4'}:
    raise SystemExit('Silent draft videos are excluded. Supply the final narrated film.')
required = [
    f'output/presentation/rill-pitch-v{args.version}.pptx',
    f'output/pdf/rill-pitch-v{args.version}.pdf',
    f'output/pdf/rill-product-brief-v{args.version}.pdf',
    str(video.relative_to(root)),
    'output/video/rill-demo-narrated.srt',
    'output/video/voiceover-timed.md',
    'output/video/SHOT-LIST.md',
    'output/video/VERIFICATION.md',
    'output/video/recording-proof.json',
    'output/video/narration-proof.json',
    'output/video/demo-fhir-bundle.json',
    'output/video/media-inspection.json',
    'output/video/timing.json',
    'output/README.md',
    'output/assets/devpost-thumbnail.png',
    'output/assets/youtube-thumbnail.png',
    'README.md', 'SECURITY.md', 'LICENSE',
    'package.json', 'package-lock.json',
]
missing = [name for name in required if not (root / name).is_file()]
if missing:
    raise SystemExit('Missing final assets: ' + ', '.join(missing))
ffprobe = os.environ.get('RILL_FFPROBE') or shutil.which('ffprobe')
if not ffprobe:
    raise SystemExit('ffprobe is required to verify that the final film includes audio.')
probe = subprocess.run([ffprobe, '-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,width,height', '-of', 'json', str(video)],
    text=True, capture_output=True, check=True)
media = json.loads(probe.stdout)
if not {'audio', 'video'}.issubset({item['codec_type'] for item in media['streams']}):
    raise SystemExit('The final film must contain both video and narration audio streams.')
if not 180 <= float(media['format']['duration']) <= 300:
    raise SystemExit('The final film must meet the three-to-five-minute submission limit.')

files = {root / name for name in required}
# These are public source/documentation directories, never build/runtime data.
source_suffixes = {'.ts', '.tsx', '.js', '.mjs', '.py', '.json', '.css', '.html', '.svg', '.sql', '.md', '.yml', '.yaml', '.txt', '.webmanifest'}
for directory in ('src', 'server', 'shared', 'tests', 'public', 'docs', 'scripts', '.github'):
    for path in (root / directory).rglob('*'):
        if path.is_file() and not path.is_symlink() and path.suffix in source_suffixes and '__pycache__' not in path.parts:
            files.add(path)
for name in ('index.html', 'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts',
             'playwright.config.ts', 'vitest.config.ts', 'Dockerfile', '.dockerignore',
             '.gitignore', '.prettierignore', '.prettierrc.json', '.gitattributes', '.env.example', 'firebase.json', '.firebaserc',
             '.gcloudignore', 'render.yaml', 'wrangler.jsonc', 'wrangler.toml', 'public/_headers'):
    path = root / name
    if path.is_file():
        files.add(path)
for name in ('overview.png', 'workflow.png', 'planner.png', 'mobile.png',
             'workflow-slide.png', 'planner-slide.png', 'devpost-thumbnail.jpg'):
    path = root / 'output/assets' / name
    if path.is_file():
        files.add(path)

for path in files:
    if path.is_symlink() or not path.resolve().is_relative_to(root):
        raise SystemExit(f'Unsafe package path: {path.name}')
    if (path.name.startswith('.env') and path.name != '.env.example') or path.suffix in {'.sqlite', '.db', '.pem', '.key', '.wav', '.mp3'}:
        raise SystemExit(f'Private/runtime file is not permitted: {path.name}')
    if path.suffix == '.mp4' and path != video:
        raise SystemExit('Only one narrated MP4 is permitted in the submission kit.')

archive = (root / (args.output or f'output/rill-submission-kit-v{args.version}.zip')).resolve()
if archive.parent != root / 'output' or archive.suffix != '.zip':
    raise SystemExit('The archive must be a ZIP directly under output/.')
archive.parent.mkdir(parents=True, exist_ok=True)
temporary = archive.with_suffix('.zip.partial')
manifest = {
    'project': 'Rill', 'creator': 'Shivam Gupta', 'version': args.version,
    'application': 'https://rill-streams.web.app',
    'source': 'https://github.com/shi1720/OneAquaHealth',
    'narration': 'OpenAI cedar synthetic voice; not a recording of Shivam Gupta',
    'files': {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(files)},
}
try:
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        bundle.writestr('START-HERE.txt',
            f'Rill {args.version} by Shivam Gupta\n\n'
            'Try the application: https://rill-streams.web.app\n'
            'Open output/README.md for the deliverable index and current verification.\n'
            f'The narrated demonstration is {video.relative_to(root)}.\n'
            'Narration uses an OpenAI synthetic voice, not a recording of Shivam Gupta.\n'
            'The demonstration observations are fictional, not real environmental findings.\n'
            'Runnable source is included: install Node.js 22.16+, run npm ci, then npm run dev.\n'
            'Source repository: https://github.com/shi1720/OneAquaHealth\n')
        bundle.writestr('MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
        for path in sorted(files):
            bundle.write(path, path.relative_to(root))
    with zipfile.ZipFile(temporary) as bundle:
        bad = bundle.testzip()
        if bad:
            raise SystemExit('Archive CRC verification failed: ' + bad)
        if sum(name.endswith('.mp4') for name in bundle.namelist()) != 1:
            raise SystemExit('Archive must contain exactly one narrated film.')
    if temporary.stat().st_size >= args.max_bytes:
        raise SystemExit(f'Archive exceeds {args.max_bytes:,} bytes. Re-encode the final film before packaging.')
    temporary.replace(archive)
finally:
    temporary.unlink(missing_ok=True)
checksummed = [root / name for name in required[:5]] + [archive]
checksum_file = root / f'output/SHA256SUMS-v{args.version}.txt'
checksum_file.write_text(''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in checksummed))
print(f'Verified {archive.name}: {len(files) + 2} files, {archive.stat().st_size:,} bytes.')
print(f'Release checksums: {checksum_file.relative_to(root)}')
