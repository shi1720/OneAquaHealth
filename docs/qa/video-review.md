# Independent final-film review

Reviewed on 23 September 2026. The reviewed artifact is [rill-demo-narrated.mp4](../../output/video/rill-demo-narrated.mp4), captured from `https://rill-streams.web.app`, with [the verbatim script](../../scripts/video/voiceover-timed.md) and [narration subtitles](../../output/video/rill-demo-narrated.srt). No material mismatch between the sampled interface states and their claims was found. This review verifies rendered frames, files, timing, text and audio signal properties. It does **not** claim human listening, intelligibility assessment or a full accessibility certification.

Reviewed MP4 SHA-256:

```text
9be8c1e87a50779793c6f44f5f72764d7acd623bbb180ab7fe1c5cde491a5eef
```

## Final-frame inspection

Frames were extracted from the completed MP4 with FFmpeg and individually inspected, including the burned-in subtitles. The cream/forest interface remains readable; the subtitle band is separate from the captured application, and the synthetic-voice disclosure is visible.

| Time | Actual visible state                                                                                                                                                                            | Assessment                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1:53 | 60-minute budget, one 40-minute visit and 20 minutes remaining; caption says the budget is reduced to 60 minutes.                                                                               | Matches the narration.                                                                                                                                        |
| 2:03 | 120-minute budget, three visits of 40, 45 and 35 minutes. Caption says another concern must wait.                                                                                               | Matches the stated tradeoff; no earlier 120-minute claim over the 60-minute screen remains.                                                                   |
| 2:33 | Verification task is in progress and the result is being entered; caption describes starting then completing the task.                                                                          | The pictured transition supports the description. The completed result is visible in the later gate frame.                                                    |
| 2:46 | Verification is completed; “Resolve after recheck” is disabled. The interface explicitly requires a recheck completed after action began, with a recorded result.                               | Correctly shows the resolution gate.                                                                                                                          |
| 3:06 | “A documented loop, closed” and completed verification/recheck results are visible. The recheck explicitly describes a fictional scenario and says water quality/contact safety remain unknown. | Closure describes documented follow-through, not proven ecological improvement.                                                                               |
| 3:30 | FHIR R4 is selected, “Download started” is visible, and the experimental mapping limitation remains on screen.                                                                                  | Consistent with the saved actual download; does not claim certified interoperability.                                                                         |
| 3:56 | Creator credit, public URL, Track 2 and proposed pilot are visible. The card explicitly says “not yet field-validated.”                                                                         | Commercial direction is presented as a proposal. “No paid AI key required” applies to the core product, while AI-generated narration is separately disclosed. |

The [saved download](../../output/video/demo-fhir-bundle.json) is a FHIR collection containing 1 Organization, 6 Locations, 9 Observations, 9 Provenance records and 4 Tasks. It contains **zero Patient resources**. This confirms the film's resource-content claim, not certification against a FHIR implementation guide.

The [recording proof](../../output/video/recording-proof.json) reports a resolved synthetic observation, completed verification and recheck tasks, and no browser exceptions. The [scene timing record](../../output/video/timing.json) has a maximum planned-to-actual scene-start delay of 0.003 seconds. This is scheduling evidence, not a claim of zero browser rendering latency.

## Timing, captions and audio-file checks

- FFprobe reports exactly **238.000 seconds**, 1920 × 1080 H.264 video at 25 frames/second and 24 kHz mono AAC audio. Both streams span 238 seconds. The complete MP4 decoded through FFmpeg without reported errors.
- The 21 script sections are contiguous from 0 through 238 seconds. The source and packaged script files match. In particular, the 60-minute narration occupies 1:50–1:58 and the return to 120 minutes occupies 1:58–2:06, matching their recorded scenes.
- The SRT contains 59 positive-duration, nonoverlapping cues, all within the film. The final cue ends at 3:57.620. Cues use at most two lines and 47 characters per line. Subtitle text matches the narration script after punctuation normalization, except that spoken “sixty” and “one hundred and twenty” are rendered as `60` and `120`.
- One cue at 0:38.420–0:41.140 reaches 26.47 characters/second. This is a minor reading-speed limitation; it is not a claim mismatch or release blocker. The other cues remain below 25 characters/second. The review does not establish that every viewer can comfortably read each cue.
- Every generated narration section contains non-silent PCM signal and has its exact allocated duration. There are no full-scale PCM samples; the largest absolute sample is 26,264 of 32,767. These checks rule out empty sections and observed PCM clipping, but do not replace listening for pronunciation, naturalness or perceived loudness.
- The generated narration's machine-transcription proof reports a 0.9765 script-token match. The SRT is corrected to the intended script and uses transcription-derived timings. A machine transcript is supporting evidence, not a listening review.

Temporary extracted frames and machine-readable calculations are under `tmp/qa/video-review/`. No application or video change was made during this bounded review.
