# Rill

**Tagline:** Turn a stream concern into the next useful check.

**Creator:** Shivam Gupta

**Primary track:** Track 2 — Data-to-Insight

**Supporting themes:** responsible assessment, resilience planning, environmental interoperability

**Repository:** [shi1720/OneAquaHealth](https://github.com/shi1720/OneAquaHealth)

> Submission copy. Add the verified public deployment and uploaded video URLs to Devpost after final deployment and recording. Describe testing using the final test report; do not claim a deployed feature or a validation result merely because it appears in the intended API contract.

## Inspiration

A citizen notices something unusual in a local stream and presses Submit. What happens next?

Observation platforms help people collect valuable evidence. A coordinator still has to decide what needs checking, what can safely wait, and who will follow through. That decision becomes difficult when reports are incomplete and the team has only two hours available.

Rill makes that decision visible. It connects a citizen's concern to a specific verification task, a responsible person, and a recheck. The aim is practical: make more of the evidence communities already collect lead to a documented response.

## What it does

Rill is an urban-stream fieldwork workspace for volunteer coordinators, river groups, and research teams. It turns uncertain citizen observations into a reviewable plan for the time a team actually has.

The signature interaction is **“Plan my next two hours.”** Rill selects feasible verification tasks within a time budget, explains the choices, and shows why other sites were deferred. A coordinator can turn the plan into tracked tasks.

The workflow connects:

1. **Observe:** record a site, time, visible signs, flow, clarity, notes, optional photograph, and how certain the observer is.
2. **Understand:** inspect the reasons for a verification priority and the available evidence. Concern and evidence strength remain distinct.
3. **Plan:** allocate a fieldwork time budget and inspect selected and deferred checks. Serious signs or unsafe conditions require coordinator or expert handling rather than ordinary volunteer dispatch.
4. **Review and act:** a coordinator records their judgment; tasks have an owner, due date, and result. Rechecks are tracked as their own tasks.
5. **Share:** export JSON, CSV, GeoJSON, or an experimental FHIR R4 environmental bundle for further work.

An isolated demonstration workspace lets judges explore the complete flow immediately. Registering creates a separate workspace for a real programme, without seeding it with fictional observations. Coordinator and volunteer roles support collaborative use.

## Why One Health

A stream is simultaneously habitat, an animal contact point, and part of people's daily environment. Rill puts those contexts beside the evidence so a coordinator can decide what should be investigated.

The product deliberately avoids turning a photograph into a health diagnosis. A report of surface growth is not proof of toxins; clear water is not proof of safety. The evidence should inform appropriate verification and expert judgment. CDC's guidance makes this distinction explicit for harmful algal blooms. [CDC guidance](https://www.cdc.gov/harmful-algal-blooms/about/how-to-recognize-a-harmful-algal-bloom.html)

## What is distinctive

OneAquaHealth already provides citizen science, dashboards, resilience mapping, and decision support. Rill is designed to complement that ecosystem with an operational question: **“Given limited fieldwork time, what should we check next, and what happened after we checked?”** [OneAquaHealth tools](https://www.oneaquahealth.eu/project-solutions/)

Other products already provide strong data collection and quality review. For example, Cartographer supports environmental monitoring, and its Riverfly workflow includes confirmatory samples. Rill's differentiation is the combination of transparent prioritisation, constrained fieldwork planning, and an accountable action-and-recheck workflow. We do not claim to have invented citizen monitoring or follow-up sampling. [Cartographer](https://cartographer.io/), [Riverfly workflow](https://help.cartographer.io/riverfly/recording-a-sample)

## How it is built

The browser application communicates with an authenticated server API. Workspaces scope their users and data. The API validates mutations and workflow transitions, stores observations and tasks, and records activity. Observation submissions carry an idempotency key; reviews carry a revision so conflicting edits can be detected.

The decision engine uses versioned, deterministic rules. The planner selects tasks within the requested budget and returns its explanation. The same inputs and policy version can be inspected and reproduced. No trained model or live generative AI is required, and no paid AI key is needed to use the core workflow.

The priority is an **experimental operational heuristic**, not a probability of pollution or illness. Human reviewers remain responsible for environmental conclusions and response decisions.

Exports preserve data labels and provenance. The FHIR option maps environmental observations to locations; it does not create fictional patient records. It is an experimental base-R4 mapping, not a claim of certification or conformance to the evolving OneAquaHealth implementation guide. [FHIR R4 Observation](https://hl7.org/fhir/R4/observation.html), [OneAquaHealth draft IG](https://build.fhir.org/ig/hl7-eu/oah/downloads.html)

## A viable path beyond the hackathon

The first customer hypothesis is a small river trust, catchment partnership, or research programme with a coordinator responsible for citizen monitoring. Volunteers would contribute for free. A managed organisational subscription would pay for coordination, audit history, hosting, and support.

A proposed starting price is **€149 per programme per month**, subject to customer interviews and a pilot. That is a hypothesis, not validated willingness to pay. We would measure coordinator time per report, time to assignment, the share of cases receiving a documented recheck, volunteer return rates, and coverage of under-observed sites.

An illustrative monthly delivery budget is €15 for allocated infrastructure, €30 for support (45 minutes at an assumed €40 per hour), and €5 for operations. That totals €50 and leaves €99 from the proposed subscription before development, sales, taxes, and fixed overhead. These are planning assumptions, not actual costs or achieved margins.

An initial pilot would run alongside an existing monitoring programme and its established scientific protocols. No pilot agreement, customer, revenue, or measured ecological improvement is claimed. The software is intended to help people use scarce time better; it does not replace sampling, ecological expertise, remediation, or statutory authorities.

## What we learned

The interesting problem is not producing another red dot on a map. It is making the next decision useful, explainable, and proportionate to the evidence.

Research also changed the competitive framing. Existing tools already provide forms, maps, review, and some confirmation workflows. Rill therefore concentrates its story on the fieldwork decision and what follows it. Separating observed concern from evidence quality is central: uncertainty should shape the next question, not be hidden behind a confident-looking score.

## Limitations and next steps

The demonstration uses explicitly synthetic observations and illustrative context. It shows software behaviour, not an environmental finding, live alert service, or field-validated prediction.

Next steps are a supervised pilot, review of the prioritisation policy by local environmental professionals, compatibility testing with real partner exports, and validation of the deployment's operational controls. Trained predictive models should only be considered once suitable data and an evaluation design exist.

The long-term ambition is straightforward: every useful citizen concern should have a visible path to a checked outcome.

## Attribution

Project created and led by **Shivam Gupta**, with AI-assisted research, design, implementation, and documentation. Any additional personal contributions should be described accurately after they occur. Third-party sources and libraries remain credited in the repository.

## Submission checks outside the project story

- Confirm eligibility directly with the organisers: the homepage's student/team restrictions conflict with the written rules and recent updates. No assumption about the creator's eligibility has been made.
- Submit before **1 October 2026, 09:30 IST** / **30 September 2026, 21:00 PDT**, with time for upload failures.
- Add the public working-demo URL, public repository, 3–5 minute video, and Track 2 selection.
- Verify that the demo, README, test report, and narration all describe the same final behaviour.

Sources for submission details: [overview](https://oneaquahealth-ieee-hackathon.devpost.com/), [rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules), [updates](https://oneaquahealth-ieee-hackathon.devpost.com/updates).
