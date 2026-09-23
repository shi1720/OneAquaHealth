# Rill: product and evidence brief

Research date: 23 September 2026. Prepared for Shivam Gupta's OneAquaHealth hackathon build. This is desk research, not customer discovery, scientific validation, or evidence of an existing partnership.

## Decision

Build **Rill: turn a stream concern into the next useful check.** The buyer-facing description is a fieldwork coordination workspace for urban-stream stewardship teams. Primary track: **Track 2, Data-to-Insight**. Responsible assessment, resilience planning, and standards are supporting capabilities rather than seven competing pitches.

The specific product wedge is the decision between a report and a response: _A coordinator has several uncertain reports and time for only two visits. Which visits would resolve the most important unanswered questions, and how will anyone know the response was completed?_

The core loop should be demonstrably functional:

1. A citizen records what they actually saw, with time, place, evidence, and uncertainty.
2. Rill identifies missing evidence and recommends a specific safe verification task.
3. A coordinator reviews an explainable queue against the available time and people.
4. A named person accepts an action, with a due date and evidence requirements.
5. A later observation checks the result; a human records the conclusion and its limits.
6. The original reporter can see that their report led to a checked outcome.

**Claim we can defend:** Rill demonstrates an explainable, capacity-aware workflow connecting citizen observations, verification, response ownership, and rechecks.

**Claim we cannot defend:** Rill is the first platform to turn water data into action, detects pathogens from photos, predicts disease outbreaks, or has proven willingness to pay.

## Existing tools and the actual competitive gap

| Product / programme     | Verified capabilities                                                                                                                                                           | Implication for Rill                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OneAquaHealth ecosystem | Its current solutions include citizen observations, city dashboards, a resilience map, GEOSSIP, and a DSS for matching stream impairments/stressors to rehabilitation measures. | A new map plus a health score substantially overlaps. Present Rill as an operational extension between their observations and expert-led response. [Official solutions](https://www.oneaquahealth.eu/project-solutions/)                                     |
| OneAquaHealth community | The community already offers groups and collaboration; the app records stream observations.                                                                                     | Do not describe community collaboration as absent. Prefer import/export and protocol alignment over requiring communities to abandon their existing tool. [Community](https://www.oneaquahealth.eu/community/)                                               |
| Cartographer            | Commercial environmental monitoring platform with forms, mobile collection, access control, maps, data export, and integrations.                                                | Login, maps, forms, and exports are necessary execution quality, not novelty. [Product](https://cartographer.io/)                                                                                                                                            |
| Cartographer / Riverfly | Riverfly's form already calculates scores, recognises a trigger breach, requests a second sample, and supports coordinator review.                                              | Even confirmatory sampling is established. Rill's differentiation must be cross-signal verification prioritisation under limited capacity and a visible response/recheck record. [Actual workflow](https://help.cartographer.io/riverfly/recording-a-sample) |
| FreshWater Watch        | Trains communities to use standardised water tests, record results, and explore an open database.                                                                               | Support trained monitoring and existing measurements. Rill is not a substitute for a validated sampling method. [Earthwatch programme](https://earthwatch.org.uk/freshwater/)                                                                                |
| Epicollect5             | Free web/mobile form creation, GPS/media collection, offline work, maps, and CSV/JSON export.                                                                                   | A generic collection app has a strong free substitute. Charge for coordinated decisions and organisational accountability, not the right to submit a photo. [Official product](https://five.epicollect.net/)                                                 |

**Novelty assessment:** the precise Rill combination is a promising positioning hypothesis. This review does not prove worldwide uniqueness. The best judge answer is an honest comparison followed by a live demonstration of one capability the comparison does not establish: selecting the next useful visit under explicit capacity and safety constraints, with the decision's inputs and limitations visible.

## Why the problem is credible

- **Fact:** CaSTCo is a funded collaborative monitoring initiative involving communities, NGOs, water companies, and other partners. Its stated objectives include data quality, usability, safety, and cost effectiveness. This supports the relevance of the coordination problem, but its project funding is not an estimate of Rill's addressable market. [The Rivers Trust, CaSTCo](https://theriverstrust.org/our-work/our-projects/castco-catchment-systems-thinking-cooperative)
- **Fact:** EPA's participatory-science toolkit emphasises documented quality assurance and whether data are fit for their intended purpose. [EPA quality assurance toolkit](https://www.epa.gov/participatory-science/quality-assurance-handbook-and-toolkit-participatory-science-projects)
- **Fact:** Riverfly separates modelled guidance from an agreed local trigger, preserving the role of the ecology contact and local context. [Riverfly targets and triggers](https://www.riverflies.org/targets-and-triggers-explained)
- **Hypothesis:** many small coordinators still bridge observation systems, volunteer availability, and follow-up reporting with fragmented communication or spreadsheets. No interviews have been conducted, so do not present this as an observed customer quote.
- **Hypothesis:** saving coordinator time while making more reports reach a documented conclusion is a stronger purchasing reason than a prettier dashboard.

## The minimum distinctive decision engine

Keep **concern**, **evidence quality**, and **work priority** separate. A clear photo is not a reliable chemical measurement. A low-confidence concern may deserve rapid verification rather than a low priority. No report does not mean good stream health.

### Deterministic first, auditable always

Use a transparent policy engine as the default. A generative model may rewrite a summary or suggest questions, but cannot silently change the priority, certify data, or close a case. Calling an ordinary rules engine an AI diagnosis weakens the submission.

Each recommendation should store its rule version, inputs, factors, contraindications, timestamps, and reason for selection. Display the contribution of each factor in plain language. Keep a human override with a required explanation.

An implementable ordering policy:

1. **Safety and urgency lane:** a suspected immediate serious incident receives an escalation prompt to the locally appropriate authority, not an invitation for untrained volunteers to approach. Unsafe access, flood conditions, darkness, or missing permission blocks a volunteer visit.
2. **Verification lane:** for safe sites, combine concerning observations, recent corroboration, unresolved contradictions, exposure context, evidence gaps, and overdue checks. These are operational priority factors, not disease probabilities.
3. **Capacity selection:** choose feasible tasks within a user-selected visit/time budget. Deduplicate reports about the same event before scoring. Explain any unselected high-priority item as blocked or beyond capacity.
4. **Coverage safeguard:** reserve a configurable share of routine monitoring for under-observed sites; otherwise well-connected neighbourhoods can dominate the queue. Do not infer demographic vulnerability from a location without an appropriate data source and justification.

A simple transparent score can be useful in the prototype, but label it **verification priority, experimental policy**. Do not imply that a score of 82 is an 82% risk of illness. A weighted heuristic is not calibrated predictive machine learning. Use a separate comparison baseline such as oldest-report-first in a clearly labelled synthetic replay.

**Best UI:** “Check the upstream access point from the public footpath. Two recent reports describe a new surface film; the latest photograph lacks a downstream comparison. This visit would resolve whether the change is still present. Estimated task time: 15 minutes. Coordinator review required.” The estimate is editable; walking time is not a route planner unless one is implemented.

### Essential data distinctions

| Entity            | Minimum useful fields                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Observation       | Observed time and submitted time; location/site; reporter; method; descriptive signs; optional numeric measurements with units and method; media; uncertainty; synthetic/live source label |
| Evidence review   | Reviewer; review time; status; missing information; conflicting observations; amendment history; approved/rejected reason                                                                  |
| Verification task | Linked observations; required question; access/training requirements; task duration estimate; assignee; due time; state; policy version                                                    |
| Response action   | Human decision; responsible organisation/person; action type; rationale; due date; external reference if one actually exists                                                               |
| Recheck           | Link to original case/action; comparable location/method/time context; new observation; reviewer conclusion; unresolved caveats                                                            |
| Audit entry       | Actor; event; timestamp; before/after values or immutable event data; source IDs                                                                                                           |

Recommended states: `reported → needs-verification → verified-concern / inconclusive / not-corroborated → action-planned → action-recorded → recheck-due → reviewed-closure`. A completed task and a scientifically confirmed improvement are different facts. Never automatically label a stream “restored” because someone pressed Complete.

## Responsible One Health story

The system connects **ecosystem evidence**, **animal contact context**, and **human use of a place** to the _need for investigation_. It does not establish causation or diagnose a public-health hazard.

- **Fact:** CDC states that visual appearance cannot determine whether a bloom is harmful; toxin testing is needed. A visual concern can justify avoiding contact and checking official advice, not a finding of toxic water. [CDC recognition guidance](https://www.cdc.gov/harmful-algal-blooms/about/how-to-recognize-a-harmful-algal-bloom.html)
- **Product decision:** use “reported foam,” “possible surface growth,” “fish distress reported,” and “verification requested.” Avoid “sewage detected,” “pathogen hotspot,” and “safe for swimming” without the appropriate evidence and authority.
- **Product decision:** all default citizen observations are from an accessible public bank; do not instruct unknown users to enter water, collect hazardous material, smell samples closely, or handle wildlife.
- **Product decision:** give people useful status feedback without broadcasting reporter contact details or precise sensitive species locations. Exact access coordinates can be team-only; public case views should be configurable and redact unnecessary personal data.
- **Impact hypothesis:** a documented, timely response may improve stewardship and help environmental professionals direct effort. A hackathon demo cannot establish fewer illnesses, reduced pollution, or restored biodiversity.

## Buyer, pilot, and commercial model

### Initial customer hypothesis

**User:** the coordinator of a small river trust, catchment partnership, urban stream association, or applied research monitoring programme.

**Budget owner:** the organisation running the monitoring programme, potentially with a municipal or grant-funded sponsor. Volunteers stay free. Municipal procurement is an expansion path, not the first assumption of a rapid self-service sale.

**Job purchased:** “Help me choose and assign the next field checks, keep a defensible record, and show sponsors what happened after the public reported a problem.”

**Why plausible:** Cartographer openly sells environmental-monitoring subscriptions and offers nonprofit pricing and invoicing. This establishes a real category of organisational spend, not Rill-specific demand. [Cartographer pricing](https://cartographer.io/pricing)

### Credible pilot targets: no partnership claimed

1. **A OneAquaHealth research-site community**, with its researchers as scientific reviewers. Coimbra is an appropriate demonstration setting because it is a project research city; use a labelled synthetic scenario rather than inventing observations.
2. **Oslo River Forum and a participating local stream group**, subject to their interest. The official Oslo research page describes collaboration between volunteer groups and the city's water/wastewater agency, making it a concrete example of the organisational pattern. [OneAquaHealth Oslo](https://www.oneaquahealth.eu/research-cities/oslo/)
3. **An independent UK catchment group already collecting validated observations**, as an integration pilot. Established tools and protocols reduce the temptation to build a new, unvalidated monitoring method.

Do not put these organisations' logos under “partners,” imply they endorsed the project, or report invented interviews, pilots, customer numbers, letters of intent, or revenue.

### Pricing and economics: explicitly unvalidated assumptions

Test **€149 per organisation per month** for one programme with unlimited citizen contributors and a small coordinator team. Charge for workflow, audit, and support; not access to environmental facts. Offer an open-source self-hosted edition and a managed service. Integrations and onboarding may be paid later if real buyers request them.

Illustrative value test: if four coordinator hours each month are saved at an assumed fully loaded cost of €40/hour, that is €160/month in staff capacity. This is arithmetic based on assumptions, not a measured saving or a pricing recommendation validated with buyers. The product must establish whether it saves those hours rather than merely moving the work into another tool.

Illustrative seller economics: allocate €15/month to infrastructure, €30 to support (45 minutes at an assumed €40/hour), and €5 to operations. At €149/month, the resulting €50 delivery-cost assumption leaves €99 before development, sales, taxes, and other fixed overhead. These are budget hypotheses, not vendor quotes, observed costs, or achieved margins. Test support load in the pilot because it could overwhelm this model.

Keep the core usable without paid AI calls. A small deployment must still budget for hosting, persistent storage, backups, transactional email, monitoring, and support. “Free API” does not imply cost-free commercial operation; check provider terms before a real paid launch. Sampling, ecological expertise, remediation, and liability are not included in the software cost.

### Eight-week pilot design

- Recruit one willing coordinator, trained reviewers, and a small volunteer group; agree a local protocol and a site list.
- Measure two weeks of the existing process: coordinator minutes per report, time to assignment, unresolved cases, repeat participation, and coverage.
- Run Rill alongside existing reporting for the next weeks, with explicit authority/escalation arrangements and manual overrides.
- Compare against the baseline using like-for-like case types. Count blocked and inconclusive tasks as well as successes.
- Success criteria to negotiate: fewer coordinator minutes, more cases receiving a documented follow-up, no increase in unsafe visits, and acceptable reviewer agreement on queue ordering.
- Stop or redesign if coordinators do not trust the recommendations, volunteers find the tasks burdensome, or integrating the workflow adds more work than it removes.

### Defensibility

The initial code and heuristics are easy to copy. A future defensible advantage could come from trusted protocol integrations, successful institutional adoption, and a consented dataset linking recommended checks to reviewer conclusions and actual effort. That feedback could improve future prioritisation. It is **not an existing moat**. Portability should remain a product strength rather than relying on trapping citizen data.

## Integration opportunities and limits

- **OneAquaHealth:** the public site map references `https://api.enora-oah.eu/api/sites/all`. The web-rendered page returned a fetch error during this research, so this is a discovered endpoint, not a verified stable API contract. Build an adapter with timeout, schema validation, source timestamp, and clearly labelled fallback data; never silently substitute synthetic data for live results. [Map](https://apps.oneaquahealth.eu/sites)
- **CSV/GeoJSON first:** these make the workflow usable with a partner's current collection tool without an unverified API promise. An import preview should show rejected rows and provenance.
- **FHIR:** OneAquaHealth has an R4 implementation guide with Location, Observation, and Specimen profiles. The reviewed version is `0.1.0-ci-build`, a draft continuous build explicitly not an authorised publication. Pin the version and distinguish a base-R4 export from actual OAH profile conformance. Do not add profile URLs unless the resource satisfies the constraints. [Official artifact list](https://build.fhir.org/ig/hl7-eu/oah/artifacts.html), [downloads and version status](https://build.fhir.org/ig/hl7-eu/oah/downloads.html)
- **FHIR scope:** an environmental observation can describe a location rather than pretending a river is a patient. Preserve units, method, provenance, and actual observation time. If an Observation uses a custom code, expose the system and definition. A JSON file with `resourceType` is not proof of interoperability; validate it and document remaining constraints.
- **Standards relevance:** the hackathon's standards session explicitly discussed the OAH IG and hands-on FHIR APIs. A small validated mapping is stronger than a broad “FHIR ready” claim. [IEEE session agenda](https://events.vtools.ieee.org/m/571958)

## Demo story that earns the claims

Open with a specific decision: **“Six concerns. Two visits. Which ones should a coordinator send today?”** Show a clearly labelled fictional programme in a real research-city context. Do not imply the synthetic concerns occurred at those places.

Suggested sequence:

1. A resident submits a surface-film observation, choosing “not sure” rather than guessing its cause.
2. Rill asks for a missing comparison and preserves the observation as unverified.
3. The coordinator changes today's available capacity. The queue selects checks with visible reasons and defers a blocked access point.
4. A reviewer assigns a safe follow-up. A volunteer records a second observation.
5. The coordinator records a response, sets a recheck, and closes only after reviewing the new evidence.
6. Export the decision trail and a standards-based bundle. The citizen sees an intelligible status update.

The emotional hook is accountability: **“A report should not disappear after you press Submit.”** The commercial hook is disciplined use of scarce fieldwork time. The scientific hook is that the system makes uncertainty actionable without pretending uncertainty has disappeared.

Show all required capability types, but spend most of the 3–5 minute video on this single complete case. Avoid a feature tour with several disconnected dashboards.

## Judging checklist and risks

The rules specify these weights: mission 30%, innovation 20%, technical implementation 20%, UX 15%, feasibility/scalability 15%. [Official rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules)

| Criterion   | Evidence to demonstrate                                                                                                                  | Likely reason to lose points                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Mission     | Citizen observation → verified evidence → human decision → recheck, with explicit ecosystem/animal/human context                         | A generic ticket system with water-themed decoration; ungrounded health claims |
| Innovation  | Capacity-aware verification choices, counterfactual ordering, evidence-gap reasoning                                                     | Claiming maps, QA, or second samples are new; arbitrary unexplained risk score |
| Technical   | Persistent authenticated multi-user workflow; tested permissions/state changes; visible provenance; validated exports; resilient imports | Browser-only demo state; hidden fake integrations; no reproducible setup       |
| UX          | Mobile guided reporting, “not sure,” accessibility, meaningful empty/error/offline states, clear ownership                               | Jargon-heavy scoring; mandatory long forms; colour-only meaning                |
| Feasibility | Named buyer hypothesis, honest alternatives, pilot metrics, modest costs, deployment/runbook                                             | Invented traction, unverified margins, treating EU grant money as market size  |

**Highest-priority failure tests:** untrained user cannot approve a case; user cannot read another private workspace; malicious free text cannot alter engine policy; missing coordinates/time cannot become verified evidence; duplicate reports do not multiply priority indefinitely; server restart preserves work; unavailable external data is labelled; no unsafe task is selected; claimed closure requires a linked recheck or explicit justified exception.

## Official-rule discrepancies and submission readiness

**Verified on 23 September 2026:** the homepage lists students only and team required; the rules allow individuals or teams and omit a student-only condition. Updates invite professionals. The rules list registration closing 31 August and a 16 September build start, while updates say registration remains open and describe a 14 September start. These inconsistencies do **not** establish Shivam's eligibility. Record the discrepancy for organiser clarification before final submission; continue building now. [Homepage](https://oneaquahealth-ieee-hackathon.devpost.com/), [rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules), [updates](https://oneaquahealth-ieee-hackathon.devpost.com/updates)

The displayed submission deadline is **30 September 2026, 9:00 p.m. PDT**, equivalent to **1 October 2026, 09:30 IST**. Use the exact timezone and plan to upload well ahead. This is not the separate citizen-science presentation activity's September 30 date or its under-ten-minute format. The hackathon requires a 3–5 minute demo, public repository, prototype, project description, and track alignment. [Hackathon homepage](https://oneaquahealth-ieee-hackathon.devpost.com/), [separate citizen-science activity](https://www.oneaquahealth.eu/citizen-science-project/)

Use truthful credits: “Project lead: Shivam Gupta” and a factual contribution statement that can be updated after his review, design choices, testing, narration, and submission. If asked about AI assistance, disclose it accurately; do not invent human coding history, fieldwork, or customer conversations. Preserve provenance for external code, content, datasets, and media.

## Open questions for later validation

1. Does the target coordinator value a new decision workspace enough to maintain it alongside an existing collection system?
2. Which local signs and protocols justify which types of verification, and who is qualified to approve them?
3. Do time estimates and task selection actually improve useful coverage compared with a simple oldest-first queue?
4. Which action owners can realistically accept responsibility, and what evidence suffices for closure?
5. Will volunteers return because their reports receive feedback? Measure this instead of claiming it.
6. Which data can be shared publicly, and which require contractual, ecological, or privacy restrictions?

No outreach, account creation, purchase, partner commitment, or field observation was performed during this research.
