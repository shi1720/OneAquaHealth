"""Export an authored PPTX through the Codex bundled LibreOffice only."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('pptx', type=Path)
parser.add_argument('--output-dir', type=Path, default=Path('output/pdf'))
args = parser.parse_args()
root = Path(os.environ.get('RILL_WORKSPACE', Path.cwd())).resolve()
runtime = Path(os.environ.get('RILL_RUNTIME', '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies')).resolve()
binary = runtime / 'bin/override/soffice'
if not binary.is_file():
    raise FileNotFoundError(f'Bundled LibreOffice required: {binary}. Do not use desktop LibreOffice.')
source = args.pptx.resolve()
target_dir = args.output_dir.resolve()
target_dir.mkdir(parents=True, exist_ok=True)
target = target_dir / f'{source.stem}.pdf'
if target.exists():
    raise FileExistsError(f'Use a new revision instead of overwriting {target}')
profile = root / 'tmp/artifacts/lo-profile'
profile.mkdir(parents=True, exist_ok=True)
subprocess.run([str(binary), f'-env:UserInstallation={profile.as_uri()}', '--headless', '--convert-to', 'pdf', '--outdir', str(target_dir), str(source)], check=True, timeout=90)
if not target.is_file():
    raise RuntimeError('LibreOffice returned without the expected PDF')
print(target)
