# Narrated demonstration verification, version 1.1.0

Final media: **rill-demo-narrated.mp4**, 3 minutes 58 seconds. The matching spoken-caption track is **rill-demo-narrated.srt**. This replaces the historical silent films in the current submission package.

## Genuine hosted workflow

The footage was captured on 23 September 2026 from **https://rill-streams.web.app**, using the actual application controls and its Firebase/Cloud Run/PostgreSQL API. The recorder created its own isolated synthetic workspace. It did not mock the displayed API responses or edit the application DOM to manufacture results.

The capture verifies the same newly submitted litter report reaches `resolved`, with both its verification task and later recheck completed. It also downloads and parses the actual environmental FHIR bundle, including Tasks and no Patient records. After verification, the disposable workspace is deleted. The recording reported **zero browser JavaScript errors**. The 23 visual scenes began no more than **0.003 seconds** later than their authored start times. See `recording-proof.json`, `timing.json`, and `demo-fhir-bundle.json`.

An earlier rehearsal exposed a rapid-typing autosave bug. It was fixed and regression-tested before the final capture. The only later UI correction restores mobile field-guide focus in WebKit; it does not change the recorded desktop workflow. The final hosted focus regression passed separately.

## Narration and captions

The narrator is **OpenAI cedar**, generated with `gpt-4o-mini-tts`. It is not Shivam Gupta's recorded voice or an impersonation. The film displays **AI-generated narration** throughout, and the publication description repeats that disclosure.

There are **21 timed narration sections** and **59 spoken-caption cues**. Scene boundaries keep the 60-minute and 120-minute comparisons, review, recheck gate, resolution and actual download aligned with their corresponding narration. Caption punctuation comes from the authored script; acoustic timestamps come from transcription. Number normalization and hyphen splitting explain most token differences. Two unmatched zero-duration transcription tokens were removed rather than displayed as speech. The raw token match was 97.65%, not a claimed speech-recognition accuracy benchmark.

The caption generator groups short fragments into readable cues, limits captions to two balanced lines and keeps sections from crossing scene boundaries. Subtitle text is burned into the film, so it remains visible without a platform caption setting. The SRT is also supplied for a platform's optional separate caption track.

## Technical and visual checks

- H.264 video, 1920 × 1080, 25 frames per second, YUV 4:2:0, exactly 238 seconds.
- AAC mono audio, 24 kHz. The complete audio track decoded successfully; its measured peak was -1.4 dBFS. Loudness normalization targets -16 LUFS, and narration tempo adjustments never exceed 1.25×.
- The entire MP4 decodes without an FFmpeg error. Fast-start metadata supports progressive playback.
- Sixteen visual checkpoints were inspected across the genuine recording. Final full-resolution checks cover both planning budgets, verification, the recheck gate, resolution, export and the closing credit. The caption band does not obscure the application; credentials and recovery keys are absent.
- Final film size: **13,797,175 bytes**, suitable for the compact submission kit's 35 MB ceiling.

These are software, transcript, media and visual checks. They do not claim a human voice-performance audition, field validation, real cleanup, water-quality improvement or certification. The film uses synthetic observations and explicitly states that water quality and contact safety remain unknown.

## Publication status

The unchanged film is [public on YouTube](https://www.youtube.com/watch?v=Ezww6CqwqWA) and available from the GitHub 1.1.0 release. YouTube Studio confirmed “Video published,” published the English SRT and custom thumbnail, and recorded the AI-usage disclosure; the public page displays an AI-content badge. Its copyright/community checks displayed no issues. The publication browser played the video through 0:21 of 3:58 and offered English captions and 1080p HD in settings.

The [Devpost project](https://devpost.com/software/rill-h8t3s5) embeds that same YouTube video and displayed “Project submitted!” on 23 September 2026 after the actual terms acknowledgment and submit action. These checks used the publication browser session; no anonymous-playback claim is made. See the [publication receipt](../../docs/qa/publication.md).

Reproduce the media using `scripts/video/README.md`; the private API key and raw audio cache are excluded from source and the submission archive.
