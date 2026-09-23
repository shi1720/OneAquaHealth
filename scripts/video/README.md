# Reproduce the narrated Rill demonstration

The final film is `output/video/rill-demo-narrated.mp4`: genuine application interactions, a disclosed synthetic narrator, and subtitles matching the spoken words. It runs 3 minutes 58 seconds. `rill-demo-narrated.srt` is the separate caption track. The voice is OpenAI cedar, not a recording or imitation of Shivam Gupta.

## Record the actual application

Install Node.js dependencies and Playwright Chromium, then run:

```sh
RILL_VIDEO_URL=https://rill-streams.web.app node scripts/video/record-demo.mjs --rehearse
RILL_VIDEO_URL=https://rill-streams.web.app node scripts/video/record-demo.mjs
```

Use a local URL for private development. The script creates its own isolated synthetic workspace, uses the real interface, verifies the report is resolved with two completed tasks, validates the actual FHIR download, records JavaScript errors, and deletes its disposable workspace. No shared account or recovery key appears in the film. Rehearsal timings are compressed; the final capture follows the authored timeline. Examine every scene's actual timestamp in `timing.json` before rendering.

## Generate narration and captions

Requires Python 3, FFprobe, and FFmpeg built with libass and drawtext. On macOS, the script detects Homebrew `ffmpeg-full`; elsewhere set `RILL_FFMPEG` to the appropriate executable. Store `OPENAI_API_KEY` in your environment or an owner-only ignored `.env.narration.local`. Never put it into source or a browser field.

```sh
python3 scripts/video/narrate-demo.py --audio-only
python3 scripts/video/narrate-demo.py
```

The first command generates and caches 21 narrated segments. The script uses `gpt-4o-mini-tts`, aligns each segment to its scene without cutting speech, transcribes the audio for word timestamps, restores punctuation from the authored script, and checks that the recording matches the script. The second command reuses that audio and renders the final H.264/AAC MP4, with burned-in spoken captions and an on-screen AI narration disclosure. Audio generation incurs API usage; the running application does not need this key.

Review the actual film for pacing, pronunciation, visual legibility, caption timing and the truth of every claim. Word matching and media probes are checks, not a substitute for listening. The presentation uses no music, external stock footage or impersonated voice. The older `render-demo.mjs` produces historical silent variants and is not used for the narrated 1.1.0 release.

## Publish

Use `docs/youtube.md` for the public title and description. Publish only the final reviewed MP4, upload the SRT when the platform permits it, use `output/assets/youtube-thumbnail.png`, and confirm public playback. Keep the description's synthetic-data and synthetic-voice disclosures. Add the verified public watch URL to `docs/submission.md` and the Devpost video field. The repository release also hosts the downloadable film and captions.
