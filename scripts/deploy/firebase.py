#!/usr/bin/env python3
"""Build and deploy Rill to its existing Firebase / Cloud Run resources.

No API keys or database passwords are read by this script. Cloud Run receives
its database credential from Secret Manager through the runtime service account.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]


def run(*command):
    subprocess.run(command, cwd=ROOT, check=True)


def verify(origin):
    with urllib.request.urlopen(origin + '/api/health', timeout=60) as response:
        health = json.load(response)
    version = json.loads((ROOT / 'package.json').read_text())['version']
    if health.get('storage') != 'postgres' or health.get('version') != version:
        raise RuntimeError('Hosted API does not match this PostgreSQL release.')
    with urllib.request.urlopen(origin, timeout=60) as response:
        if response.status != 200 or b'<div id="root">' not in response.read():
            raise RuntimeError('Hosted application shell did not load.')
    print(f'Verified {origin}: release {version}, PostgreSQL, HTTPS application shell.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', default='gen-lang-client-0444960702')
    parser.add_argument('--site', default='rill-streams')
    parser.add_argument('--region', default='us-central1')
    parser.add_argument('--instance', default='rill-postgres')
    parser.add_argument('--secret-version', default='1')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--skip-tests', action='store_true', help='Only after the same source passed CI.')
    args = parser.parse_args()
    # These arguments form resource names and URLs, never shell commands.
    import re
    for value in [args.project, args.site, args.region, args.instance]:
        if not re.fullmatch(r'[a-z][a-z0-9-]{2,62}', value):
            parser.error('Resource identifiers must contain lowercase letters, digits and hyphens.')
    if not re.fullmatch(r'[1-9][0-9]*', args.secret_version):
        parser.error('Pin a numeric Secret Manager version.')
    origin = f'https://{args.site}.web.app'
    if args.verify_only:
        verify(origin)
        return
    run('gcloud', 'sql', 'instances', 'describe', args.instance, '--project=' + args.project,
        '--format=value(state)')
    run('npm', 'ci')
    if not args.skip_tests:
        run('npm', 'run', 'typecheck')
        run('npm', 'test')
    run('npm', 'run', 'build')
    revision = subprocess.check_output(['git', 'rev-parse', '--short=12', 'HEAD'], cwd=ROOT, text=True).strip()
    image = f'{args.region}-docker.pkg.dev/{args.project}/rill/api:release-{revision}'
    run('gcloud', 'builds', 'submit', '--project=' + args.project, '--tag=' + image, '.', '--quiet')
    instance = f'{args.project}:{args.region}:{args.instance}'
    environment = ','.join([
        'NODE_ENV=production', 'APP_ORIGIN=' + origin,
        f'APP_ALLOWED_ORIGINS=https://{args.site}.firebaseapp.com',
        'SESSION_COOKIE_NAME=__session', 'REQUIRE_REMOTE_DATABASE=true', 'HOST=0.0.0.0',
        'PGHOST=/cloudsql/' + instance, 'PGDATABASE=rill', 'PGUSER=rill_app', 'PGPOOL_MAX=3',
    ])
    run('gcloud', 'run', 'deploy', 'rill-api', '--project=' + args.project,
        '--region=' + args.region, '--image=' + image,
        f'--service-account=rill-runtime@{args.project}.iam.gserviceaccount.com',
        '--allow-unauthenticated', '--port=8787', '--memory=512Mi', '--cpu=1',
        '--min-instances=0', '--max-instances=2', '--concurrency=20', '--timeout=60',
        '--add-cloudsql-instances=' + instance, '--set-env-vars=' + environment,
        '--set-secrets=PGPASSWORD=rill-db-password:' + args.secret_version, '--quiet')
    config = json.loads((ROOT / 'firebase.json').read_text())
    config['hosting'].pop('target', None)
    config['hosting']['site'] = args.site
    config['hosting']['public'] = str(ROOT / 'dist')
    config['hosting']['rewrites'][0]['run']['region'] = args.region
    # Keep the temporary config beside the repo so Firebase sees a coherent root.
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', prefix='firebase-', dir=ROOT / 'tmp') as handle:
        json.dump(config, handle)
        handle.flush()
        run('npx', '--yes', 'firebase-tools@15.30.2', 'deploy', '--only', 'hosting',
            '--project', args.project, '--config', handle.name, '--non-interactive')
    verify(origin)
    run('env', 'RILL_SMOKE_ORIGIN=' + origin, 'npx', 'tsx', 'server/smoke.ts')
    print('Deployment and disposable end-to-end API smoke passed.')


if __name__ == '__main__':
    (ROOT / 'tmp').mkdir(exist_ok=True)
    main()
