# Reproducible real-UI demonstration

The recording is an actual Chromium session against a running Rill application. Playwright clicks the real interface, submits a synthetic observation, commits a field plan, completes real database tasks, reviews/actions/rechecks/resolves the observation, and downloads an actual FHIR bundle. It does not replace the dashboard with mocked screens or call API endpoints to fake the demonstrated state. The only overlays are a small recording cursor and post-production explanatory captions. A separate designed end card presents the proposed pilot and credits.

From the repository root, run `node scripts/video/capture-isolated.mjs`. This is the preferred complete workflow: it starts a separate non-watching API and Vite instance, creates a temporary SQLite database, rehearses all actions, records the paced **3 minute 58 second** session, and renders both final videos. The servers stop and the temporary database is removed when the workflow finishes. It leaves your normal development database and accounts untouched. Ports default to 8793 and 5182; set `RILL_VIDEO_API_PORT` and `RILL_VIDEO_WEB_PORT` to change them. Use `--rehearse-only` for a quick workflow check.

To record against an already running application instead:

1. Run Rill at `http://localhost:5173` (`npm run dev`). Set `RILL_VIDEO_URL` if different.
2. `node scripts/video/record-demo.mjs --rehearse` validates the full workflow quickly.
3. `node scripts/video/record-demo.mjs` records a paced **3 minute 58 second** session at 1440×900.
4. `node scripts/video/render-demo.mjs` uses FFmpeg to produce 1920×1080 H.264 files. Set `RILL_FFMPEG` / `RILL_FFPROBE` if the binaries are not on PATH or in the standard Homebrew location.

The source app must remain running and structurally stable during capture. Each run uses one independent synthetic demo workspace and deletes that workspace after it has verified the completed workflow. The rehearsal also asserts that a fresh observation does not display a restored-draft message. It does not clear rate limits or change real accounts. If the demo creation limit is reached, use the isolated runner or wait; do not weaken deployment limits.

## Files

- `output/video/rill-demo-clean.mp4`: silent footage with the complete interface visible and optional, disabled-by-default soft subtitles. Best for adding Shivam's narration.
- `output/video/rill-demo-captioned.mp4`: silent footage with explanatory captions burned into a separate band below the interface. Useful for immediate review without audio.
- `output/video/rill-demo-captions.srt`: matching timed captions.
- `output/video/timing.json`: planned/actual scene starts and source-video trim information.
- `output/video/recording-proof.json`: confirms the demonstrated observation reached `resolved`, with completed verification and recheck tasks and no browser exceptions.
- `output/video/demo-fhir-bundle.json`: actual synthetic export downloaded during recording.
- `output/video/media-inspection.json`: FFprobe codec, duration, and dimensions.
- `output/video/frames/`: representative captured and final encoded frames for visual QA.
- `output/video/end-card.html`: editable end-card source.

Every report, task finding, and outcome in the recording is synthetic and labelled accordingly. The video does not claim real fieldwork, customers, ecological improvement, formal FHIR certification, or external authority notifications. It contains no real passwords or private account data. The proposed managed subscription is a commercial hypothesis, not a launched paid service.

Use the timed narration in `output/video/voiceover-timed.md` for the closest match to this footage. Speak naturally, leaving pauses for actions. The broader project script remains in `docs/demo-script.md`. Add your own voice to the clean MP4 in an editor, check the captions and final duration, and export H.264/AAC for submission. Do not present the silent version as if it already contains a recorded voiceover.

After recording your narration, run `node scripts/video/add-voiceover.mjs /absolute/path/to/your-narration.wav`. This normalizes speech loudness and adds AAC audio to the clean video. Add `--captioned` to use the captioned footage. It preserves the video without another encode when the narration fits; a slightly longer recording holds the end card, up to the hackathon's five-minute maximum. It never synthesizes a voice and refuses to overwrite an existing narrated final. Review the finished timing before submission.
