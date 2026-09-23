# Rill video publication copy

The narrated film is complete: 238 seconds, 1920 × 1080, H.264 video and AAC audio, recorded against the hosted application at `https://rill-streams.web.app`. [Download the MP4](https://github.com/shi1720/OneAquaHealth/releases/download/v1.1.0/rill-demo-narrated.mp4). The OpenAI cedar narration contains 21 timed sections with matching captions. The voice is synthetic, not a recording of Shivam Gupta.

**Published video:** https://www.youtube.com/watch?v=Ezww6CqwqWA

The video is public. YouTube Studio showed “Video published”; the English SRT and custom thumbnail were published, the AI-usage disclosure was enabled with a public AI-content badge, and copyright/community checks displayed no issues. Playback advanced to 0:21 of 3:58 in the publication browser, with English captions and 1080p HD available in settings. The [submitted Devpost project](https://devpost.com/software/rill-h8t3s5) embeds this same video. These observations do not claim an anonymous or signed-out playback check. [Publication receipt](qa/publication.md).

## YouTube title

Rill | Two Hours to Turn Stream Reports Into Action | OneAquaHealth

## YouTube description

A stream concern. One volunteer team. Two hours to decide what to check next.

Rill turns citizen observations into an explained fieldwork plan, then connects each concern to a human review, assigned work and a documented recheck.

Created by Shivam Gupta for the OneAquaHealth IEEE Global Hackathon 2026.
Primary track: Track 2, Data-to-Insight.

Try the app: https://rill-streams.web.app
Source code and setup: https://github.com/shi1720/OneAquaHealth
Decision methodology: https://github.com/shi1720/OneAquaHealth/blob/main/docs/methodology.md
Testing and verification: https://github.com/shi1720/OneAquaHealth/blob/main/docs/qa/verification.md

WHAT YOU WILL SEE

• A citizen report that preserves uncertainty.
• Verification priority explained separately from evidence strength.
• A 120-minute fieldwork plan with selected and deferred visits.
• Human review, task ownership and recorded results.
• A recheck required after action before the case can close.
• An actual environmental export, including an experimental FHIR R4 option.

The footage shows real interactions with the application. The demonstration sites, reports and follow-up results are fictional and labelled synthetic. This is a software demonstration, not real environmental findings or evidence of improved water quality.

Rill uses transparent, versioned rules. No trained AI model assesses the stream, and the core workflow needs no paid AI key. Visual signs do not establish pollution, pathogens or contact safety. The planner allocates estimated work time; it does not calculate a walking route. FHIR support is experimental, with no certification claim.

VOICE AND CREATION DISCLOSURE

The narration uses an AI-generated voice from OpenAI. It is not a recording of Shivam Gupta's voice. The project was created and led by Shivam Gupta with AI-assisted research, design, implementation and testing.

WHAT COMES NEXT

A supervised pilot with an existing monitoring programme to test coordinator time, documented follow-through and the appropriateness of recommendations. No customers, pilot partnership or measured environmental benefit is claimed.

Rill is an independent submission and is not endorsed by OneAquaHealth, IEEE or OpenAI.

#OneAquaHealth #CitizenScience #OneHealth

## Deployment note for publication

The live application uses PostgreSQL on Google Cloud SQL, a Cloud Run API and Firebase Hosting. The hosted API workflow has been verified. A scoped logical database restore passed. Platform backup restoration, point-in-time recovery and long-term reliability remain outside that evidence. The local setup below remains usable without cloud credentials.

## Short pitch

A citizen notices a problem in a stream. The coordinator has two hours and several places to check. Rill makes that decision explainable: which visits fit, which need expert attention, and who will follow through. Each concern stays connected to its human review, assigned work and recheck. Built by Shivam Gupta for OneAquaHealth, Rill helps a monitoring team turn community observations into a checked outcome.

## Testing instructions for judges

No shared account or password is required for the demonstration. Use a current desktop browser for the shortest evaluation; the interface also supports mobile.

### Open the demo

1. Open `https://rill-streams.web.app` and choose **Explore the live demo**. The local instructions below are an alternative for inspecting and running the source.
2. Confirm that the workspace is labelled as a demonstration. It contains six fictional sites and synthetic reports. Your changes belong to this isolated demo, not another judge's workspace.
3. Open **Field planner**. In a fresh demo, **2 hours** selects three visits within 120 estimated minutes. Reduce **Available field time** to 60 minutes, then return to **2 hours**. Read both the selected work and the deferral reasons. Leave the plan unassigned for the simple case walkthrough below, so there is no existing task at its site.
4. Open **Observations**, search for `foam`, and open a report. Inspect the evidence, the reasons for verification priority and the One Health context. Close the dialog when finished.

### Complete a report and recheck

1. Choose **New observation**, select **Riverside playground**, then **Continue**. Select **Litter**, continue, and enter this field note: `Synthetic test: bottles beside the stream, observed from the public path.` Continue to review and choose **Submit observation**.
2. Search observations for `Synthetic test`, open the new report and choose **Review & respond**.
3. In **Coordinator's decision note**, enter `Synthetic test: reviewed the visible litter report and its uncertainty.` Choose **Mark as reviewed**.
4. Enter `Synthetic test: an appropriate response is recorded as underway.` Choose **Mark action underway**. Confirm **Resolve after recheck** is disabled.
5. Under **Type of work**, choose **Recheck after action**. Keep yourself as the owner, choose a suitable due date if needed, then **Create task** and **Start task**.
6. In **What did you find?**, enter `Synthetic test: the later check documents changed visible conditions. Water safety remains unknown.` Choose **Complete task**.
7. Add the decision note `Synthetic test: reviewed the recheck result and recorded the conclusion.` Choose **Resolve after recheck**. The case should show **A documented loop, closed.**
8. Open **Decision trail** and inspect the recorded steps. In **Impact & evidence**, export JSON to inspect the retained record and try the experimental FHIR R4 export.

These notes describe a fictional software test. They do not record actual cleanup, sampling or a real field visit. To test committing a plan, start another fresh demo, review the access confirmation in **Field planner**, and choose **Assign this plan**. Each assigned visit should appear as a task with an owner and due date.

### Optional account and recovery check

Choose **Create a workspace** with an email you control and a unique passphrase of at least 12 characters. The new workspace should be empty. Save the displayed recovery key privately before continuing; do not include it in screenshots or video. Add a site in **Team & settings**, sign out, and sign in again to confirm persistence.

To test offline recovery, sign out, choose **Sign in** and **Forgot your passphrase?**, then enter your email, saved key and a new passphrase. Save the replacement key. The old key should no longer work and earlier sessions should be signed out. No recovery email is sent, and email ownership is not verified. Losing both the passphrase and key leaves no email recovery route.

### Run the source locally

Requires Node.js 22.16 or newer and npm. No API key is needed.

```sh
git clone https://github.com/shi1720/OneAquaHealth.git
cd OneAquaHealth
npm ci
npm run dev
```

Open `http://localhost:5173` and choose **Explore the live demo**. Automated verification is available through `npm test`, `npm run typecheck`, `npm run build` and `npm run test:e2e`; the browser suite needs Chromium installed with `npx playwright install chromium`.

## Published version

The public title and description above are retained for reproducibility and future edits. Keep the synthetic-data and synthetic-voice disclosures when updating either platform. The GitHub release MP4 remains the downloadable copy. Publication checks and their scope are recorded in [the receipt](qa/publication.md); publication is complete and no further upload is required for this version.
