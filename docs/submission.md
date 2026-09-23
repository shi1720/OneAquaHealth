# Rill

**Tagline:** Two hours. A clear plan. A checked outcome.

**Creator:** Shivam Gupta

**Primary track:** Track 2: Data-to-Insight

**Repository:** https://github.com/shi1720/OneAquaHealth

**Working demo:** https://rill-streams.web.app

**Demo video:** [Watch the published demonstration](https://www.youtube.com/watch?v=Ezww6CqwqWA)

**Submitted project:** https://devpost.com/software/rill-h8t3s5

> Publication status: the YouTube demonstration is public, and Devpost displayed “Project submitted!” on 23 September 2026. The project contains the story, testing instructions, technology list, live app and repository links, video, gallery images, thumbnail and submission ZIP. [Publication receipt](qa/publication.md). The seven sections below are the story fields. This note is not part of the story.

## Inspiration

Imagine a Saturday morning beside an urban stream. Someone reports foam below a footbridge. Other reports arrive from nearby sites. A coordinator has one volunteer team and two hours.

Which concern should they check first? Which needs expert attention? And who will find out whether the response helped?

That is the moment Rill is built for.

Citizen observations give communities more eyes on their waterways. Turning those observations into responsible follow-through takes time, judgment and coordination. Rill connects a report to the next useful check, the person responsible, and a documented recheck.

This matters for One Health because the same stream is wildlife habitat, an animal contact point and part of people's everyday surroundings. Better coordination could help teams investigate concerns sooner and make their response easier to explain. That is the impact we want to test.

## What it does

Rill is a shared fieldwork workspace for river groups, citizen-science coordinators and research teams. It answers one practical question: **with two hours available, what should our team check next?**

A citizen records what they saw, where and when they saw it, and how certain they are. A coordinator sees verification priority separately from evidence strength, with the reasons behind each suggestion.

The **Field planner** selects visits within the available time. Change the budget and the selection changes. Every selected or deferred site has an explanation. Restricted locations and serious warning signs stay out of routine volunteer plans and require human handling. Estimates support allocating work; the planner does not calculate a walking route.

The plan becomes assigned tasks with owners, dates and recorded results. A coordinator reviews the case and records the response. **The case cannot be resolved until a recheck created after action began is completed with a result.** Recording an action is only one step in the workflow.

Rill also supports private workspaces, coordinator and volunteer roles, mobile observation drafts, photographs, validated CSV/JSON imports, and JSON, CSV, GeoJSON and experimental FHIR R4 exports. Historical decision snapshots preserve the rule version and reasons used at review. An optional OneAquaHealth directory supplies real site names and coordinates; local access still needs checking.

Our primary fit is **Track 2: Data-to-Insight**. The insight becomes a concrete decision about what to verify and who should follow through. Habitat, animal contact and human use remain connected to the evidence. Visual observations do not establish toxins, pathogens or whether water is safe.

## How we built it

Rill uses React and TypeScript for the interface, a Hono API for the workflow, and tenant-scoped SQL storage. The tested core supports SQLite, libSQL and Cloudflare D1. The hosted deployment uses PostgreSQL on Google Cloud SQL, a Cloud Run API and Firebase Hosting. The hosted API workflow has been exercised through registration, planning, review, recheck and export. New workspaces start empty. The instant demo creates a separate workspace with six fictional sites and clearly labelled synthetic reports.

The decision engine uses published, versioned rules. An exact budget allocator chooses at most one eligible visit per site while respecting the time constraint. Tests compare its selection against exhaustive enumeration on small cases. This proves the allocation matches its stated policy, not that the policy predicts environmental harm.

The core requires no paid AI key and sends no observations or photographs to an external language model. Its priorities are explainable operational suggestions, with a human reviewer responsible for conclusions.

Behind the interface are validated requests, role checks, duplicate-submission protection, conflict detection, atomic writes and attributed records. Offline recovery keys are single-use secrets stored only as hashes. Recovery replaces the password and key and revokes previous sessions.

Project created and led by **Shivam Gupta**, with AI-assisted research, design, implementation and testing. Third-party tools and sources are credited in the repository.

## Challenges we ran into

**Making uncertainty useful.** A high-priority report can still have weak evidence. We separated urgency for verification from evidence strength so uncertainty becomes a reason for the next check rather than a false claim of certainty.

**Planning responsibly.** Several reports can describe the same place. Counting each as another visit wastes scarce capacity. Rill plans once per eligible site, explains deferrals, and keeps unsafe work out of routine volunteer assignments.

**Proving follow-through.** A completed task can predate the response it supposedly verifies. The interface and API now enforce the order of action and recheck, and preserve the reasoning recorded at review.

**Keeping real use dependable.** Repeated requests, concurrent changes and account recovery exposed edge cases beyond the main demo. Regression tests cover those cases, including recovery when ordinary audit storage is full and protection against losing a newly displayed recovery key by accidentally closing its dialog.

## Accomplishments that we're proud of

We built a complete path from a citizen report to an explained plan, a human decision, assigned work and a recorded recheck. Judges can explore the isolated demo immediately without shared credentials.

Version 1.1 passed its [complete GitHub Actions run](https://github.com/shi1720/OneAquaHealth/actions/runs/35825616783): 86 tests with SQLite, 86 with libSQL, 53 PostgreSQL tests, all 18 browser scenarios and the container build/lifecycle checks. The SQLite/libSQL runs each skip four PostgreSQL-only tests. Separate hosted testing passed 17 browser scenarios, a rapid-typing regression, three focused WebKit flows and 39 privacy/role assertions across the documented frontend fixes. Those hosted checks are distinct from the final CI suite. These are software checks, not scientific or field validation. [Verification record](https://github.com/shi1720/OneAquaHealth/blob/main/docs/qa/verification.md)

The result is usable beyond a slide: a working application, public source, reproducible setup, documented decision rules, exportable evidence and a clear pilot proposal.

## What we learned

The scarce resource is often the coordinator's attention. Useful software must reduce the work between receiving a report and knowing what happened next.

We also learned to be precise about novelty. OneAquaHealth already offers collection, dashboards and decision support, while tools such as Cartographer already support environmental monitoring and review. Rill's proposed niche is the combination of explained choices under a time constraint and a required action-and-recheck record. That differentiation still needs testing with real teams. [OneAquaHealth solutions](https://www.oneaquahealth.eu/project-solutions/), [Cartographer](https://cartographer.io/)

Finally, an honest boundary makes the product more useful. A score cannot establish water safety. A closed task cannot prove ecological improvement. A pilot should measure both coordination value and the quality of the decisions it supports.

## What's next for Rill

Start with one river or catchment monitoring programme and an eight-week supervised pilot alongside its established protocols. Have an environmental professional review the prioritisation policy and track coordinator time per case, assignment delay, completed rechecks, missed priorities and volunteer burden. Routine coverage of sites without reports also needs a deliberate place in that pilot.

The first buyer hypothesis is the organisation coordinating the work. Volunteers would contribute free. A proposed managed service at **€149 per programme per month** would fund hosting, coordination tools and support. An illustrative €50 monthly delivery budget includes €15 for allocated infrastructure, €30 for support and €5 for operations. That leaves €99 before development, sales, taxes and fixed overhead. The infrastructure allowance is a planning assumption, not a confirmed cloud bill. Pricing, costs and willingness to pay are assumptions to test, not achieved results.

A scoped logical database restore has passed. Further work includes platform-level recovery drills and longer-term operational testing, partner import compatibility, additional coordinator roles and expert review of interoperability. The current FHIR R4 mapping is experimental and has no certification claim. No customers, pilot agreement or environmental improvements are claimed today.

The ambition is simple: **every useful stream concern should lead to a visible, checked outcome.**
