# Rill rubric review, version 2

Reviewed 23 September 2026. This is an AI-assisted internal assessment of the current software and submission package. It is not official judging, external assurance, customer research or a forecast of winning. The reviewer contributed research and presentation material, so this is not an independent external review.

The strongest case is a specific coordination decision: **a team has two hours, several stream concerns and a responsibility to follow through.** Show how Rill chooses eligible work, explains what waits, and requires a later recheck before closing the case. This is more persuasive than presenting every feature with equal emphasis.

## Basis and limits

This pass read the current submission, README, decision methodology, API contract, verification record, prior review and relevant browser workflow code/tests. Earlier passes inspected recovery security and reviewed every final pitch/brief page. This pass rechecked the official event overview and rules; it did not rerun the application suites, interview users or evaluate real ecological outcomes.

The [official rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules) give five weighted criteria: mission 30%, innovation 20%, implementation 20%, UX 15%, and feasibility/scale 15%. The overview calls implementation “Architecture” and feasibility “Scale.” The assessment below uses those same categories. The seven tracks describe project fit, not seven separate scoring opportunities. [Official overview](https://oneaquahealth-ieee-hackathon.devpost.com/)

Current evidence includes 75 automated checks under each documented SQLite/libSQL configuration, ten browser scenarios, CI container verification, actual workflow footage, authentic screenshots and documented source code. Permanent public hosting and the final narrated/uploaded video remain unverified in this pass. [Verification record](verification.md)

## Release 1.1.0 progress after this assessment

The hosting gap identified below has narrowed: **https://rill-streams.web.app** is live on Firebase Hosting, Cloud Run and PostgreSQL on Cloud SQL. The hosted API lifecycle passed registration, session handling, review/recheck gates, planning, action, closure, export and deletion. Current local results are 86 passing checks under each SQLite/libSQL configuration with four PostgreSQL-only skips, plus 53 passing checks in the dedicated PostgreSQL suite. The hosted deployment passed 17 existing Chromium scenarios, a separate typing regression, three focused WebKit flows and 39 privacy/role assertions across documented frontend fixes. The final [CI run](https://github.com/shi1720/OneAquaHealth/actions/runs/35825616783) passed both jobs at commit `5ed7ee8`, including all 18 browser scenarios, 86 tests under each SQLite/libSQL configuration, 53 PostgreSQL tests and the container checks. [Current verification](verification.md)

The original score below remains a dated internal assessment rather than an automatically increased score. Public hosting improves demonstrability but does not supply buyer interviews, field outcomes or a proven market. A [scoped logical restore](cloudsql-restore.md) now passed for 12 tables and 61 schema objects; platform backup restoration, point-in-time recovery and application cutover remain untested. The 238-second narrated film is complete and records the hosted application, with OpenAI cedar accurately disclosed as a synthetic voice. The [YouTube film](https://www.youtube.com/watch?v=Ezww6CqwqWA) is public, and [Devpost](https://devpost.com/software/rill-h8t3s5) acknowledged submission on 23 September 2026. The [publication receipt](publication.md) records the observed checks. Updated 1.1.0 deck and brief pages all passed visual review.

## Assessment against the five criteria

Scores are subjective estimates on the official 1 to 10 scale. Weighted contributions use `score / 10 × weight`. They describe this review's confidence in the current evidence, not the judges' likely decision.

| Criterion                       |   Weight | Internal score |   Contribution | What supports it                                                                                                                                                             | What limits it                                                                                                                                                      |
| ------------------------------- | -------: | -------------: | -------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Impact and mission alignment    |      30% |            8.0 |           24.0 | Connects citizen evidence to human decisions and follow-up. Habitat, animal contact and human use are visible. Safety overrides routine dispatch.                            | No evidence yet that coordinators save time or make more appropriate environmental decisions. Follow-through measures are not ecological or health outcomes.        |
| Innovation and creativity       |      20% |            7.0 |           14.0 | The two-hour constraint and required later recheck create a clear, demonstrable combination. Transparent reasons make the tradeoff understandable.                           | Existing monitoring tools already have maps, quality review and confirmation workflows. The rules and planner are technically reproducible; no established moat.    |
| Architecture and implementation |      20% |            9.0 |           18.0 | Persistent authenticated workflow, roles, transactional changes, imports, retained decision snapshots, recovery, tests across storage adapters and actual browser scenarios. | Remote persistence, restore and sustained load remain unproven. Experimental FHIR output has no implementation-guide conformance claim.                             |
| UX                              |      15% |            8.0 |           12.0 | Consistent visual design, guided reports, isolated demo, explainable decisions, responsive layouts and documented automated accessibility checks.                            | No field usability study, full screen-reader evaluation or multilingual experience. The number of concepts can still overwhelm a first-time coordinator.            |
| Feasibility and scale           |      15% |            7.0 |           10.5 | A clear organisational buyer hypothesis, open source, no paid inference requirement, data portability and modest deployment options.                                         | No buyer interviews, willingness-to-pay evidence or live pilot. Onboarding/support costs and a single-coordinator account model limit the current commercial story. |
| **Total**                       | **100%** |                | **78.5 / 100** | Strong software and a coherent story.                                                                                                                                        | The largest gaps are external evidence and deployment readiness.                                                                                                    |

Do not put this score in the public pitch as proof of quality. A cleaner film may communicate the existing strengths better, but it cannot turn hypotheses into validation.

## Fit across all seven tracks

| Track                         | Honest fit             | Evidence and boundary                                                                                                                                                | Submission decision                                                             |
| ----------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1. Citizen Science UX         | Supporting             | Guided observations, accessible controls and local draft recovery. No measured participation or data-accuracy improvement.                                           | Demonstrate briefly as the entry to the main workflow.                          |
| 2. Data-to-Insight            | **Primary, strongest** | Citizen reports become explained verification priorities and time-budget decisions, with human/animal/environment context and follow-up evidence.                    | Select this track and name it clearly in the story and video.                   |
| 3. AI-Supported Assessment    | Partial pattern fit    | Validation, explanations and human review fit responsible assessment. The engine uses deterministic rules; it does not run a trained or generative assessment model. | Describe responsible decision support. Do not label it an AI assessment engine. |
| 4. Awareness and Storytelling | Supporting             | One Health explanations and the connected report-to-recheck story make the problem relatable. There is no evaluated learning programme.                              | Use the story to communicate impact, not as a separate education-product claim. |
| 5. Community and Gamification | Limited                | Team roles, ownership and follow-through can support collaboration. There are no validated retention gains, points, leaderboards or community challenges.            | Do not claim a gamification solution.                                           |
| 6. Resilience Informatics     | Partial                | Capacity planning and referral workflows support an operational response. No weather model, hazard forecast or automated early-warning service is present.           | Discuss relevance to preparedness without calling the current app predictive.   |
| 7. Digital Health Standards   | Supporting             | Environmental FHIR R4 export plus portable structured data. The mapping is experimental; no certified OAH profile conformance or partner round trip is proven.       | Show one real export and state the boundary in one sentence.                    |

Track descriptions are supplied in the [official overview](https://oneaquahealth-ieee-hackathon.devpost.com/). Fit judgments are this review's interpretation of the shipped product. Adding an unnecessary model or points system to claim more tracks would weaken the focus.

## Prioritised improvements

### P0: complete the submission path

1. **Verify the public application before naming its URL.** Run the full report/review/action/recheck/export path on the deployment from a fresh browser. Confirm data survives a restart or redeploy, validate backup and restore on a disposable dataset, and test recovery without a previously authenticated session. Success means a judge can use the link unaided and stored records survive the hosting lifecycle. This directly supports implementation, UX and feasibility.
2. **Finish and verify the narrated film.** Use the real UI footage, keep the synthetic labels visible, check every spoken claim against the screen, and export within 3 to 5 minutes. Disclose the planned OpenAI-generated voice clearly as synthetic. Verify audio, captions, legible text and link access on the actual uploaded version. The description must not call a silent draft narrated.
3. **Replace pending links and resolve participation details.** The overview says students/team required while written rules allow individuals or teams; the displayed registration timeline also differs from the registration-open notice. The creator must confirm eligibility and registration status with the organisers. The displayed deadline is 1 October 2026 at 09:30 IST, equivalent to 30 September at 21:00 PDT. Do not claim submission or eligibility is complete based on the repository alone. [Overview](https://oneaquahealth-ieee-hackathon.devpost.com/), [rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules)

### P1: strengthen the evidence behind the idea

4. **Evaluate whether the suggested checks make sense to a qualified reviewer.** Prepare a small, labelled case set that includes uncertain reports, multiple accounts at one site, serious signs, access restrictions, stale reports and sites with no reports. Ask a qualified environmental professional to rank the necessary next actions without first seeing Rill's score. Record disagreement and reasons, not a headline accuracy number. This requires a real reviewer and permission to report their involvement; no review has been conducted or endorsed here.
5. **Test the coordination value against an existing workflow.** Use the same cases with the team's current spreadsheet or tools and with Rill. Measure total coordinator effort, time to assignment and documented rechecks, including corrections and failed attempts. Treat any synthetic software replay as an engineering demonstration, not measured user benefit. Do not infer that maximizing Rill's own score proves environmental value.
6. **Make routine coverage an explicit pilot requirement.** The current concern-driven planner cannot select a site with no report. Define a separate periodic coverage policy with the pilot team, and review whether reported locations crowd out less-observed places. Acceptance requires visibility into unvisited sites and a reviewer-approved way to cover them, not simply an extra score weight.
7. **Validate the buyer and costs before presenting a commercial conclusion.** Test the €149 monthly price with prospective programme coordinators after they try the workflow. Ask what it replaces, who controls the budget and how much setup/support it requires. Record all answers, including rejection. The illustrative €50 delivery budget excludes development, sales, taxes and fixed overhead; support could exceed it. A successful interview or pilot cannot be claimed until it occurs.

### P2: prepare for programme use

8. **Support continuity when a coordinator leaves.** Add and test a controlled second-coordinator or ownership-transfer flow before relying on Rill for a real organisation. Protect the last coordinator and record role changes. The current role model does not establish multi-administrator operational continuity.
9. **Validate one real import/export handoff.** Use a permitted sample from a prospective partner, confirm field meanings and provenance, and test a round trip. Validate FHIR against the agreed target profile only when that profile and use case are known. A valid-looking bundle does not establish integration.
10. **Test with intended users and varied access needs.** Observe a first-time volunteer and coordinator complete the workflow without coaching. Record abandonment, terminology confusion and corrections. Supplement automated scans with keyboard and screen-reader review; evaluate language needs with the pilot group. Do not call current axe checks full accessibility certification.

## Pitch recommendations already reflected in the new copy

- Start with a person, a place and a time limit. The opening should be understandable before the product name or technical stack appears.
- Give the planner and recheck gate most of the demonstration time. They express the product's purpose better than a tour of account settings.
- Show the tradeoff, not only the selected list: change from 60 to 120 minutes and explain one deferred site.
- Use one observation through review, response and a later recheck. Preserve uncertainty throughout.
- End with the prospective buyer and a supervised pilot that can establish value. Keep price assumptions separate from measured results.
- Credit Shivam Gupta as project creator, disclose AI assistance accurately, and identify synthetic voice narration as synthetic. No fabricated hands-on contributions, customers or fieldwork.

## Submission acceptance check

The public story now has the seven requested Devpost fields. The YouTube document includes a title, description, disclosure, short pitch and reproducible judge instructions. Before publishing, verify that every URL works, the public film matches its description, and any newly added claims are supported by the final deployed build. All three revised documents use no em dashes.

These recommendations do not authorise contacting people, publishing, signing up for services or claiming approvals. This review made no external account changes and sent no messages outside the project team.
