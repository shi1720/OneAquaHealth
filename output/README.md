# Rill submission package

**Shivam Gupta · OneAquaHealth IEEE Global Hackathon 2026 · Track 2: Data-to-Insight**

Rill turns citizen stream concerns into explained verification plans, accountable work and documented rechecks. The demonstration is synthetic. It shows working software, not environmental findings or customer validation.

## Start here

- [Try the live application](https://rill-streams.web.app)
- [Watch the public YouTube demonstration](https://www.youtube.com/watch?v=Ezww6CqwqWA)
- [View the submitted Devpost project](https://devpost.com/software/rill-h8t3s5)
- [Download the narrated demonstration](https://github.com/shi1720/OneAquaHealth/releases/download/v1.1.0/rill-demo-narrated.mp4)
- [Download the complete 1.1.0 kit](https://github.com/shi1720/OneAquaHealth/releases/download/v1.1.0/rill-submission-kit-v1.1.0.zip)
- [Project source and run instructions](https://github.com/shi1720/OneAquaHealth)
- [Submission description](../docs/submission.md)
- [Answers for the judging conversation](../docs/judge-questions.md)
- [Verification record](../docs/qa/verification.md)
- [Hosted deployment and operational boundaries](../docs/deployment-firebase.md)

The current deliverables are version **1.1.0**. The application uses Firebase Hosting, Cloud Run and PostgreSQL on Cloud SQL. The hosted API lifecycle has been verified. Hosted browser/privacy checks and the narrated workflow are documented in the linked verification records. The [final CI run](https://github.com/shi1720/OneAquaHealth/actions/runs/35825616783) passed both jobs at commit `5ed7ee8`, including all 18 browser scenarios, 86 tests per SQLite/libSQL configuration, 53 PostgreSQL tests and container checks.

## Slides and brief

| File                                                       | Purpose                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [Editable pitch deck](presentation/rill-pitch-v1.1.0.pptx) | Eight slides with native editable text and source notes.    |
| [Pitch deck PDF](pdf/rill-pitch-v1.1.0.pdf)                | Shareable rendering of the presentation.                    |
| [Product brief PDF](pdf/rill-product-brief-v1.1.0.pdf)     | Four-page product, architecture, impact and business brief. |
| [Devpost thumbnail](assets/devpost-thumbnail.png)          | Original 1200 × 800 project cover.                          |
| [YouTube thumbnail](assets/youtube-thumbnail.png)          | Original 1280 × 720 video cover.                            |

All twelve final presentation and brief pages have been rendered and visually reviewed. [Artifact verification](../scripts/artifacts/VERIFICATION.md) records structure, checksums and review scope. Unversioned PDFs and PPTX remain historical 1.0 artifacts.

## Narrated demonstration

The canonical narration is **3 minutes 58 seconds**, divided into 21 timed sections. It uses an OpenAI-generated cedar voice. It is not a recording of Shivam Gupta. The final film records the real hosted application in 1920 × 1080 H.264 with AAC narration. It includes 59 matching spoken-word caption cues. The public YouTube version has English captions and a custom thumbnail; a downloadable GitHub release MP4 is also provided above.

- [Timed narration](video/voiceover-timed.md) and [matching subtitles](video/rill-demo-narrated.srt).
- [Shot list](video/SHOT-LIST.md), [video verification](video/VERIFICATION.md), and [narration metadata](video/narration-proof.json) and [independent media review](../docs/qa/video-review.md).
- [Actual synthetic FHIR export](video/demo-fhir-bundle.json) and [recording proof](video/recording-proof.json).
- [YouTube title, description, AI voice disclosure and judge instructions](../docs/youtube.md).

The final local film is `output/video/rill-demo-narrated.mp4`. MP4s are distributed as release assets to keep the repository lightweight. Earlier silent films are historical drafts and are excluded from the 1.1.0 submission kit. [Reproduction instructions](../scripts/video/README.md) describe the recording pipeline.

## Compact release bundle

Rebuild the package with `python3 scripts/package-release.py`. The builder requires an actual audio stream, the three-to-five-minute duration limit and all final assets. It creates `output/rill-submission-kit-v1.1.0.zip` with exactly one MP4, slides, brief, captions, documentation, runnable source and a SHA-256 manifest. The archive must remain below 35,000,000 bytes. Raw audio, databases, credentials, scratch captures and dependencies are excluded.

## Publication completed

The demonstration is [public on YouTube](https://www.youtube.com/watch?v=Ezww6CqwqWA). Studio confirmed publication, English captions and a custom thumbnail, with the AI-usage disclosure enabled. In the publication browser, playback advanced and settings offered English captions and 1080p HD.

Devpost displayed **“Project submitted!” on 23 September 2026** for [Rill](https://devpost.com/software/rill-h8t3s5). The saved project includes the story, testing instructions, technology list, app and repository links, the matching embedded video, three gallery images, thumbnail and submission ZIP. [Publication receipt](../docs/qa/publication.md) records the observed scope without claiming anonymous playback or an eligibility ruling.

The source and hosted application are public. Commercial pricing and the proposed pilot remain hypotheses; no customer validation or scientific fieldwork is claimed. This refreshed local kit records completed publication. Replacement of the previously uploaded release and Devpost ZIP with this documentation update is verified separately by the release operator.
