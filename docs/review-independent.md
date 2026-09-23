# Independent adversarial review of Rill

Reviewed 23 September 2026. This is an AI-assisted internal review, requested by the project lead, not judging-panel feedback, external assurance, security certification, user research, or field validation. Scores are this reviewer's opinion about the inspected build before the fixes below. Changes made after this review need separate verification.

**Final review update:** the baseline findings and 73/100 score below are retained as a record of the first inspection. The implementation was subsequently changed and retested; see the final delta at the end of this document for the current assessment and remaining limitations.

## Verdict

Rill has a coherent hackathon wedge: explain how limited coordinator capacity becomes accountable follow-up. Its strongest work is the deliberately modest environmental interpretation, server-enforced workspace boundaries, chronological recheck gate, and exact budget selection. The implementation is more substantial than a static dashboard.

It is not yet supportable to call the inspected build a complete production service. The real-workspace map, export completeness and attribution, urgent dashboard visibility, team administration, and actual pilot evidence are material gaps. The idea's commercial promise is plausible but unvalidated. A well-executed demonstration can earn credibility; claims of unique invention, proven impact, or an existing moat would lose it.

## Rubric assessment

The official rules use these five weights. [Official rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules)

| Criterion                    | Reviewer score / 10 | Weighted points / 100 | Reason                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------: | --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mission alignment and impact |                   8 |                    24 | Citizen concern, safe verification, accountable action, and recheck fit the mission. Ecosystem and health effects remain unmeasured; generic One Health text is context, not inferred environmental intelligence.                                                                                                                   |
| Innovation and creativity    |                   7 |                    14 | Capacity-constrained verification plus follow-through is a clear product angle. Rules, knapsack, maps, and ticket lifecycles are established techniques. No comparative outcome evidence yet establishes that their combination makes better field decisions.                                                                       |
| Technical implementation     |                   7 |                    14 | Persistent API, isolation, strict validation, idempotency, optimistic review locking, and safety exclusions are meaningful. The exported audit is incomplete/unattributed, real map is false geography, and historical policy decisions lack snapshots.                                                                             |
| UX                           |                   8 |                    12 | Guided reporting, explicit uncertainty, explanatory factors, simple navigation, and a runnable synthetic story are promising. Urgent reports disappear from the overview, roles are not fully reflected in action controls, and some administrative workflows dead-end. Full visual/mobile accessibility QA is outside this review. |
| Feasibility and scalability  |                   6 |                     9 | A bounded, inexpensive deployable architecture and a specific buyer hypothesis are sensible. Integration is export-only, there is no paying/user pilot evidence, routine administration is missing, and the managed-service cost model is assumed.                                                                                  |
| **Total**                    |                     |          **73 / 100** | **Internal opinion, not a prediction of placement.**                                                                                                                                                                                                                                                                                |

## Findings requiring correction before the final demo

### P1 — Real workspaces are rendered as fictional Coimbra geography

`src/Map.tsx:5` defines six fixed point positions. `src/Map.tsx:18–27` labels the drawing as Coimbra, positions any supplied sites on those same six points, and slices the list to six. Stored latitude/longitude never affect placement. A new site in India is shown in Coimbra; a seventh site disappears despite the displayed site count increasing. The illustrative disclaimer reduces but does not fix the contradictory context.

**Fix:** reserve the illustration for the synthetic workspace. Render real coordinates in an explicitly coordinate-derived view, or use an honest site directory until geographic mapping exists. Display every supported site and an intentional empty state. Do not imply a real habitat layer from decorative polygons.

### P1 — Complete evidence export loses audit events and actor attribution

`server/app.ts:72` reads only 100 audit events for a workspace. `/api/export` at `server/app.ts:333–341` uses this same object. `src/Evidence.tsx:9` calls JSON “Complete workspace evidence,” but the exported history silently truncates after the first 100 recent events. Separately, `server/export.ts:14` removes `actorName`; `AuditEvent` in `shared/types.ts` has no stable actor identifier to retain. Exported review decisions therefore have no actor identity even when their entries survive truncation.

**Reproduction:** an isolated in-memory application was given 106 audit events. JSON export returned 100. Its example event had `id`, `entityId`, `action`, `detail`, and `createdAt`, with no actor name or reference. No shared development database was modified.

**Fix:** export the complete history independently of the dashboard's latest-events window. Preserve a stable pseudonymous actor reference, or accurately disclose the retained actor names. Label previews as partial. Test more than 100 events and verify attribution across submission, review, task, and closure events.

### P1 — Unresolved urgent incidents can disappear from the overview

`src/Overview.tsx:10` excludes every urgent assessment from the featured card. The only overview observation table is limited to four newest reports at `src/Overview.tsx:15`. After four later ordinary reports, an unresolved fish-distress incident is no longer visible on the landing dashboard. Avoiding an ordinary volunteer suggestion is correct; hiding the urgency is not.

**Fix:** a separate persistent urgent-referral lane, with the authority-contact instruction, a count, and direct access to unresolved urgent evidence. Keep it distinct from field-plan selection. Test an older urgent incident plus several newer baseline reports.

### P2 — Evidence copy implies verified independence

`src/Detail.tsx:11` says “supporting independent reports.” The engine only counts distinct accounts and explicitly says their real-world independence is not verified. This contradicts a valuable limitation in `shared/engine.ts`.

**Fix:** “other accounts with matching reports,” retaining the existing 48-hour and identity caveats. Do not equate multiple accounts with independently verified observers.

### P2 — Recheck labels incorrectly imply physical return visits

`server/app.ts:289–291` correctly permits hazardous-site rechecks only as coordinator administrative records of authority advice. `src/Evidence.tsx:8` describes every completed recheck as “A return visit after action,” while `src/Detail.tsx:12` asks for a follow-up visit. A valid administrative confirmation would inflate that physical-visit metric.

**Fix:** label the metric “Documented follow-up” or model physical verification and administrative authority confirmation separately. The dangerous-site workflow should never encourage a visit through its headings or default task title.

### P2 — The planned recording does not demonstrate constrained choice

The inspected seed contains six sites, two excluded as sensitive, with eligible visit costs of 25, 30, 24, and 20 minutes. The 120-minute plan uses 99 minutes and selects all four eligible sites. The video's signature moment therefore demonstrates a list fitting the budget, not a scarce-capacity tradeoff.

**Reproduction:** invoking `buildFieldPlan` with the fixed 23 September scenario produces two visits at 60 minutes (55 used): Willow footbridge, score 59; Market culvert, score 53. School and playground then have genuine budget deferrals. At 120 minutes all four fit.

**Fix:** show 60 minutes first, inspect the deferred alternatives, then expand to 120. If the two-hour wording must remain central, use a clearly labelled scenario with more than two hours of eligible work. Ensure the same case is chosen for the narrated observation-to-recheck loop; a newly submitted litter report can lose the per-site selection to another existing observation.

## Operational and credibility gaps

| Priority | Finding and evidence                                                                                                                                                         | Consequence / recommended response                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2       | `src/Detail.tsx:13` renders start/complete controls for every member's open task. Backend enforcement at `server/app.ts:303–304` correctly rejects other volunteers.         | Hide or explain unavailable controls using stable assignment IDs. Do not weaken server checks.                                                                                                                                     |
| P2       | No task cancellation/reassignment, site amendment/archive, member removal, password change/recovery, or secondary coordinator is exposed by the inspected API.               | Wrong assignments, changed access, departed staff, and forgotten credentials require operator intervention. Either implement routine administration or document a supervised pilot boundary.                                       |
| P2       | Review events retain notes but not the assessment inputs/factors/time shown to the reviewer; `workspace()` recomputes assessments against current time.                      | The historical reason for a decision cannot be reconstructed from the audit alone. Store decision snapshots including policy version, evaluated-at time, factors, and evidence IDs. Do not claim historical replay already exists. |
| P2       | Submission says Rill complements existing collection tools; current integration is export-only.                                                                              | A programme already using Cartographer/OneAquaHealth must re-enter observations. Prioritize a validated import preview or adapter before calling it a plug-in operational layer.                                                   |
| P3       | `src/Detail.tsx:9` enables resolution after any completed recheck; backend correctly requires completion after action. UI result-note threshold is 10 while API requires 12. | Predictable error loops. Match validation and chronology at the interface while retaining backend authority.                                                                                                                       |
| P3       | `src/ObservationForm.tsx:17` advances through empty notes, while API requires eight characters. The draft-restored message is set immediately after draft creation.          | Validate required notes before advancing and distinguish a recovered draft from a fresh one.                                                                                                                                       |
| P3       | Volunteer export links remain visible although `/api/export` is coordinator-only.                                                                                            | Explain the restriction or hide unavailable export controls instead of downloading an error response.                                                                                                                              |

The planner's exactness is about maximizing its chosen numerical objective under its estimated cost constraint. That is a valid engineering claim. It is not proof of optimal ecological benefit, useful information gain, a safe route, or actual minutes saved. Site-time estimates and scoring weights still require a local protocol and evaluation. There is no routine-coverage safeguard in the inspected optimizer; unreported sites never enter the candidate queue. State this bias in methodology and pilot design.

## Facts, hypotheses, and unsupported claims

| Statement                                                                                                                                   | Status                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The inspected implementation has an authenticated persistent workflow, role checks, deterministic factors, and exact constrained selection. | Supported by code inspection and existing test design; targeted planner checks reproduced here. Full suite execution belongs to the integration QA report. |
| The demo reports and locations are fictional. Real registration starts with no seeded reports.                                              | Explicitly supported by seed/auth code. Preserve labels in screenshots and video.                                                                          |
| More coordinator time or better follow-through will improve ecological or human-health outcomes.                                            | Reasonable causal hypothesis, not demonstrated impact.                                                                                                     |
| A €149 monthly subscription is acceptable and delivery costs €50.                                                                           | Unvalidated price and operating-cost assumptions. Include onboarding, backups, support variability, sales, and customer acquisition in pilot economics.    |
| Rill already has a moat, customers, a scientific model, or OneAquaHealth endorsement.                                                       | Unsupported. The current research/submission drafts appropriately avoid these claims.                                                                      |
| Rill is worldwide unique or has invented confirmatory monitoring.                                                                           | Unsupported and unnecessary. Demonstrate the narrow coordination capability instead.                                                                       |

Cartographer already markets environmental monitoring, volunteer collaboration, mapping, interpretation, integrations, and established customer use. Its public pricing lists a free starter tier, paid tiers, and nonprofit discounts. That validates a category of spend, not demand for Rill; it also raises the switching-cost bar. [Cartographer product](https://cartographer.io/), [Cartographer pricing](https://cartographer.io/pricing)

The defensible commercial answer is: first test whether one coordinator can use Rill alongside an established protocol with less total work. Measure time per case and documented follow-up against the existing process. Charge only after demonstrating that value. Trusted integrations, scientifically reviewed policies, and consented outcome/effort feedback might become advantages over time. None is an existing asset today.

## Recommended judging narrative

1. Open on a concrete coordinator constraint and a clearly labelled synthetic scenario.
2. Show uncertainty surviving submission. Briefly show one urgent report going to authority referral rather than volunteer dispatch.
3. At 60 minutes, explain one selected site and one capacity-deferred site. At 120, show the changed selection.
4. Complete one genuinely connected review → task result → action → later recheck → reviewed closure sequence. A recorded action does not prove ecological improvement.
5. Export the attributable history and explain the experimental FHIR boundary in one sentence.
6. End with the buyer, a testable pilot success metric, and the honest impact goal. Avoid a generic feature tour.

A reproducible fixed scenario compared with a simple oldest-first queue can explain what the optimizer changes. Label it a synthetic policy comparison; a higher sum of the application's own heuristic is not independent evidence that it makes better environmental decisions.

## Scope of this review

Inspected `shared/engine.ts`, `shared/seed.ts`, shared types, authenticated server routes, storage/security/export code, browser workflow components, existing test cases, research, submission copy, and narration. Ran isolated in-memory export verification and direct fixed-scenario planner checks. Rechecked the official rubric and Cartographer's own product/pricing pages. Did not create external accounts, contact anyone, change shared records, duplicate the full browser suite, or certify production security, scientific validity, FHIR conformance, accessibility, or customer demand.

## Final delta after implementation and QA

Reviewed again on 23 September 2026 against the local application. The reviewer subsequently implemented the settings/import improvements and their tests, so this follow-up is an internal verification pass, **not an independent external audit**. No additional scientific validation, customers, interviews, partnerships, revenue, or competitive novelty evidence appeared during this work.

### What changed, and what was verified

| Baseline issue                                          | Final state and evidence                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real sites rendered as fictional Coimbra                | `src/Map.tsx` now branches real workspaces to a coordinate-derived plot with an explicit “No basemap / Not for navigation” label and all-site buttons. The decorative Coimbra drawing remains specific to the synthetic demo. This is an honest geographic scope; it is not a navigable map.                                                                       |
| Truncated and unattributed audit export                 | The export route now reads the full audit independently of the latest-100 dashboard window; JSON retains actor names. A focused backend regression creates more than 100 audit entries and checks the complete export and attributed review snapshot.                                                                                                              |
| Historical rationale drift                              | Each review now stores policy version, evaluated-at time, score, evidence tier, and reason contributions. The observation trail displays the historical snapshot. This documents the evaluated rationale; it is not a complete replay dataset containing every original input or an immutable ledger.                                                              |
| Urgent incidents hidden by newer ordinary reports       | `src/App.tsx` now presents a persistent authority-referral banner for unresolved urgent observations, separate from the ordinary fieldwork suggestion.                                                                                                                                                                                                             |
| Independent-observer wording and return-visit overclaim | Account-based evidence wording and documented-follow-up wording now reflect the narrower facts.                                                                                                                                                                                                                                                                    |
| Two-hour demo fits every eligible visit                 | The labelled synthetic visit estimates now total more than two hours. Reproduced final 120-minute selection: Willow, Market, and Playground, with School deferred for capacity. At 60 minutes only Willow fits the selected objective. This shows a genuine software constraint, not measured field productivity.                                                  |
| Team and site administration gaps                       | Coordinators can edit sites, list/add/remove volunteers, cancel and replace open tasks, and use stable member IDs when assigning. Real users can change their passphrase; previous sessions are revoked. Backend checks still enforce who may update tasks.                                                                                                        |
| No incoming integration                                 | CSV/JSON preview now requires explicit source-to-destination site mapping, rejects invalid batches, preserves textual notes, prevents synthetic-to-real imports, and uses stable retry keys. Original author identity and review decisions are deliberately not asserted. A live read-only site directory provides coordinate candidates with local safety review. |
| Cancellation lost observation-level history             | During the final pass, cancellation was found to drop the task's association from the observation trail. Task audit entries now carry observation linkage. A browser regression created, started, and cancelled a task, then confirmed **Task Assigned, Task Started, and Task Cancelled** remained in that observation's trail.                                   |

### Final test evidence from this review

- **52 unique surface/viewport checks** across 1440-pixel desktop and 390-pixel mobile: landing screen, overview, observation list, three detail tabs, four reporting steps, planner/tasks, three evidence tabs, settings, create/edit site, create/remove member, password/deletion dialogs, catalog/prefill, and import/upload preview. Final axe scans against WCAG 2 A/AA and WCAG 2.1 AA tags returned **zero reported violations**, with **zero page/dialog horizontal overflows** in these checked states.
- The initial scan found the hidden photo input lacked an accessible name and one import helper text contrast was 4.42:1. Both were corrected and the affected states were rescanned. Contrast scans waited for modal animation completion; transient animation opacity is not a stable text colour.
- **11 parser tests** cover actual Rill CSV/JSON exports, BOM/CRLF/quoted multiline fields, malformed quote boundaries and row widths, literal formula-like notes, explicit sites, valid calendar/timezone handling, batch/file limits, synthetic provenance, and deterministic duplicate keys.
- **Three settings Playwright scenarios passed:** site/team/password administration; mapped import/retry/synthetic blocking; and a deterministic catalog failure/retry/filter/restricted-prefill workflow. The catalog scenario mocks a fixture rather than relying on an external service in CI.
- A separate real integration check returned **106 OneAquaHealth directory sites across five cities**. This establishes a successful directory read at the check time; it does not establish continued upstream availability, access permission, monitoring results, or an institutional partnership.
- Disposable local real accounts were deleted after the checks. These were software test accounts using reserved example addresses, not external registrations or environmental observations.

Machine-readable accessibility results and the cancellation check are in `docs/qa/accessibility-results.json`. Settings scenarios are in `tests/e2e/settings.spec.ts`. Automated scans do not replace screen-reader/manual accessibility review, representative user testing, or security review. Deployment verification is a separate workstream; this review did not certify a public production service.

### Current rubric opinion

| Criterion                    | Initial / 10 | Final / 10 | Weighted final / 100 | Why the score changed, or did not                                                                                                                                                                      |
| ---------------------------- | -----------: | ---------: | -------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mission alignment and impact |            8 |          8 |                   24 | Strong mission fit remains. Correct integration and safer presentation help credibility; they do not prove environmental or health impact.                                                             |
| Innovation and creativity    |            7 |          7 |                   14 | The operational wedge is clearer, but no new competitive or outcome evidence establishes a novel scientific method or defensible moat.                                                                 |
| Technical implementation     |            7 |          8 |                   16 | Audit completeness/snapshots, incoming data, account/site administration, role-aware controls, and regression coverage address material defects. Operational hardening and external validation remain. |
| UX                           |            8 |          9 |                 13.5 | Reported blockers were corrected, administration is usable, and the checked desktop/mobile states pass accessibility/layout scans. This is still a reviewer judgment, not a measured usability study.  |
| Feasibility and scalability  |            6 |          7 |                 10.5 | Explicit import mapping and real directory access make an integration pilot more practical. Pricing, support costs, acquisition, buyer demand, and field utility are still hypotheses.                 |
| **Total**                    | **73 / 100** |            |         **78 / 100** | **Internal opinion; no placement, impact, or commercial-success prediction.**                                                                                                                          |

### Remaining actionable limitations

1. **P2 — Supervised-pilot launch boundary.** Forgotten-password recovery, verified invitations/email ownership, MFA/SSO, multi-coordinator administration, and a site archival policy remain absent. Passphrase change is useful but does not recover a forgotten credential. Define the operator support procedure before accepting a real programme.
2. **P2 — Scientific and commercial validation.** The optimizer maximizes its own uncalibrated heuristic using coordinator-supplied access costs. There is no established information-gain benefit, productivity gain, ecological improvement, willingness to pay, or existing moat. Run the proposed protocol-reviewed pilot and compare against the current workflow before making those claims.
3. **P2 — Coverage bias.** Sites without visible-concern reports do not enter the planner. A quiet site can mean missing participation rather than healthy water. A routine-coverage budget or separate under-observed-site workflow remains a meaningful next product increment.
4. **P3 — Historical on-screen view is bounded.** The complete JSON audit is available, but the application still shows the latest 100 workspace events. A long-running observation can outlive that window. Label the on-screen trail window clearly or load history per observation before larger pilots.
5. **P3 — Resolution affordance can be premature.** `Detail` enables the resolution control for any completed recheck, while the API correctly requires that recheck to have completed after action. An earlier recheck can therefore produce an avoidable server error. Mirror the chronological eligibility in the UI; retain server enforcement.
6. **P3 — Geographic limits remain deliberate.** Real sites are a relative coordinate plot, without routing, terrain, permissions, or map-service context. Demo additions beyond the original illustrated six sites require the site directory/other views; the decorative map is not an extensible geographic product. Keep these boundaries visible.

No unresolved P1 defect was established in this bounded final pass. That statement is limited to the checked code and flows, not a guarantee that none exists. The strongest submission remains a truthful demonstration of the integrated decision loop and a precise supervised-pilot proposal, rather than a claim to have already solved environmental monitoring or proven a startup.

### Integration follow-up by the implementation lead

The two remaining P3 interface issues above were subsequently corrected: the observation trail now explicitly labels the latest-100 workspace-event window, and resolution availability checks the retained action timestamp against completed recheck evidence. The API still enforces chronology. These edits do not change the reviewer’s score or establish external assurance. Final execution evidence is recorded in [verification](qa/verification.md).
