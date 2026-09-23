# Decision methodology

Rill answers an operational question: which observations deserve verification with the capacity available? The algorithm does not estimate water quality, disease, toxicity, pollutant concentration, or ecological status. It is a transparent, uncalibrated heuristic intended for supervised pilot evaluation.

The source of truth is [`shared/engine.ts`](../shared/engine.ts), including `ENGINE_VERSION`. Every review records a historical snapshot of the version, assessed time, score, priority, evidence tier, and factor explanations. Reopening a report can show a newer assessment as time and reports change. The decision trail preserves the earlier review snapshot.

## Priority and evidence are different

Priority sums a reported-signal weight, support from other accounts, public-access context, recency, an evidence gap, and multiple visible concern types, with an upper bound of 100. No visible concern or a wildlife sighting alone adds no incident priority. A high score means more reason for human attention under this policy, not a high probability of contamination.

Evidence is `limited`, `developing`, or `corroborated`. The engine counts distinct accounts reporting a matching concern at the same site within 48 hours. The counts are not verified independent observers; collusion, duplicate identities, selection bias, uneven coverage, and differing observation skill remain possible. A photograph is supporting evidence for a person to inspect. No image classifier runs.

The code publishes every weight. These weights are design choices, not values derived from labelled environmental outcomes. Do not use the score as a public health threshold or train a model against the synthetic demonstration and claim field accuracy.

## Safety rules override the budget

Reported dead/distressed fish prompt immediate local environmental-authority contact. Fast water, unusual odour, restricted/sensitive sites, and unresolved hazardous reports keep a site out of volunteer field plans. A coordinator may record professional advice and arrange qualified assessment. Sampling/cleanup task labels do not grant training or permission.

Site access context and time estimates are supplied by coordinators. The live OneAquaHealth directory provides a research location; it does not certify public access. Imported catalog sites begin restricted in the editor until the coordinator checks local conditions. Public-bank-only observation, non-disturbance of wildlife, and local authority advice govern fieldwork.

## Exact allocation within a defined budget

The planner builds at most one candidate per site: the highest-priority unresolved eligible observation. One visit covers a site, rather than dispatching several people to duplicate foam reports. Sites with an existing open task are deferred.

The visit cost is `max(10, ceil(accessMinutes)) + 10` minutes. The final ten minutes is a demonstration assumption for careful observation. These independent access allowances are not measured travel times between selected sites.

A 0/1 knapsack dynamic programme maximises the sum of candidate priorities within an integer budget of 20–480 minutes. Tie-breaking prefers less used time, then stable candidate ordering. The output orders selected visits by priority; it does not optimise a walking route. Every exclusion or deferral carries a reason. Exhaustive-enumeration regression tests verify the optimiser on small generated cases.

The current demo contains four eligible concern sites totalling 160 estimated minutes. A 120-minute plan cannot take every candidate. Two other sites are restricted demonstration locations. Change the slider to expose the tradeoff rather than claiming a fixed productivity gain.

## Accountable follow-through

Reviews follow `new → reviewed → actioned → resolved`. Every transition requires a coordinator's note and current revision. Resolution requires a completed recheck created after action begins, with a meaningful result. The recheck can document a public-path observation or qualified authority advice. It is not proof of remediation effectiveness or water safety.

Task ownership binds to a stable user ID. A volunteer can update only assigned work, while a coordinator can coordinate the team. Cancelling a task records the reason in the audit history; the cancelled task no longer blocks planning. The trail is an application log, not an immutable ledger.

## Pilot evaluation before stronger claims

A proposed supervised pilot would compare coordinator handling time and time to assignment against the team's current method, track completed rechecks, and have an expert review missed priorities and unsafe suggestions. Record the denominator, unsuccessful reports, corrections, and participant burden. Do not optimise only for number of reports or headline “accuracy.”

Pre-register success/failure criteria with the pilot partner. Review access bias and account independence. Adjust weights only with a recorded version and evaluation rationale. Ask whether the workflow reduces coordination effort before proposing a predictive model.

Sources: [OneAquaHealth tools](https://www.oneaquahealth.eu/project-solutions/), [citizen science guidance](https://www.oneaquahealth.eu/citizen-science-project/), [Riverfly monitoring](https://www.riverflies.org/), [CDC harmful algae guidance](https://www.cdc.gov/harmful-algal-blooms/about/index.html). Rill's particular weights and optimisation policy are project design choices, not recommendations from those organisations.
