"""Package reviewable submission assets without databases, keys, or scratch captures."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
required = [
    "output/presentation/rill-pitch.pptx",
    "output/pdf/rill-pitch.pdf",
    "output/pdf/rill-product-brief.pdf",
    "output/video/rill-demo-clean.mp4",
    "output/video/rill-demo-captioned.mp4",
    "output/video/rill-demo-captions.srt",
    "output/video/voiceover-timed.md",
    "output/video/SHOT-LIST.md",
    "output/video/VERIFICATION.md",
    "output/video/recording-proof.json",
    "output/video/demo-fhir-bundle.json",
    "output/video/media-inspection.json",
    "output/video/timing.json",
    "output/README.md",
    "SECURITY.md",
    "LICENSE",
]
missing = [name for name in required if not (root / name).is_file()]
if missing:
    raise SystemExit("Missing final assets: " + ", ".join(missing))

files = {root / name for name in required}
for directory in ("docs", "output/assets", "scripts/artifacts", "scripts/video"):
    files.update(path for path in (root / directory).rglob("*") if path.is_file())
archive = root / "output/rill-submission-kit.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
    bundle.writestr("START-HERE.txt", "Rill — by Shivam Gupta\n\nOpen output/README.md for the deliverable index.\nThe MP4 files are silent; record output/video/voiceover-timed.md and use the audio helper in scripts/video.\nSource code: https://github.com/shi1720/OneAquaHealth\nCurrent deployment and test status: docs/deployment.md and docs/qa/verification.md.\n")
    for path in sorted(files):
        if "__pycache__" not in path.parts:
            bundle.write(path, path.relative_to(root))

with zipfile.ZipFile(archive) as bundle:
    bad = bundle.testzip()
    if bad:
        raise SystemExit("Archive CRC verification failed: " + bad)

assets = [root / name for name in required[:6]] + [archive]
checksum_file = root / "output/SHA256SUMS.txt"
checksum_file.write_text("".join(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n" for path in assets))
print(f"Verified {archive.name}: {len(files)} files, {archive.stat().st_size:,} bytes.")
print(f"Release checksums: {checksum_file.relative_to(root)}")
