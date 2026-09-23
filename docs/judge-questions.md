# Rill: answers for the judging conversation

Use these answers as a concise starting point. Keep the distinction between working software, a synthetic demonstration, and an untested business hypothesis.

**What is the problem in one sentence?**

A river coordinator has more citizen reports than time to investigate, and needs a defensible way to choose the next checks and ensure someone follows through.

**What is the memorable demonstration?**

Give the team 60 minutes, inspect the selected and deferred sites, then give it 120. The selection changes under the same transparent policy. Turn the plan into assigned tasks and follow one report through a later recheck and documented closure. The budget is real in the software; the demonstrated field observations are explicitly fictional.

**Why does this deserve its own product when OneAquaHealth already has dashboards?**

Rill concentrates on the coordinator's operational decision: which feasible checks fit available time, who owns them, and what evidence supports closure. Existing platforms already do collection, mapping, review, and some confirmation workflows well. Our differentiation is a hypothesis about this connected handoff. Imports, exports, and a live site directory let us test that hypothesis alongside an existing programme without claiming an institutional integration agreement.

**Where is the AI?**

This is a Track 2 data-to-insight entry. The working decision engine uses published deterministic rules and an exact allocation algorithm. Its reasons are visible, and environmental conclusions stay with people. We chose reproducibility and explicit uncertainty because we do not yet have an appropriate labelled dataset or field evaluation for a predictive model. AI assisted development; it does not silently analyse residents' photos or decide whether water is safe.

**Does the highest score mean the most polluted site?**

No. It is an experimental priority for follow-up under a stated policy. Evidence strength is separate. The score is not a pollution measurement, probability of harm, or ecological diagnosis. A high-priority report may need expert attention; it does not automatically become a volunteer visit.

**What makes the time allocation correct?**

The allocator exactly maximizes its documented objective under the supplied time budget, over eligible sites, with at most one check per site. Tests compare it against exhaustive enumeration. That establishes the implementation's optimization property. It does not prove ecological benefit, calibrated visit times, or an optimal walking route. Those need independent pilot evaluation.

**Who pays, and why?**

The proposed buyer is a river trust, catchment partnership, or research programme that pays a coordinator to manage citizen monitoring. Volunteers contribute free. We would test a €149 monthly managed subscription only if the programme demonstrates enough value from reduced coordination work and clearer follow-up. We have not established willingness to pay or acquired customers.

**Do the economics work?**

Our illustrative monthly delivery budget is €50: €15 allocated infrastructure, €30 support, and €5 operations. At the proposed €149 price, that leaves €99 before development, sales, taxes, and fixed overhead. The important unknown is support and onboarding effort. A pilot should record those costs, as well as coordinator time, before treating this as a scalable margin.

**What is the moat?**

There is no established moat today. Potential advantages would come from trusted protocol integrations, validated follow-up policies, and permissioned evidence about which checks helped teams make decisions. A transparent rules engine alone is easy to copy. We need to earn trust and measurable workflow value rather than claim defensibility from a dashboard or an AI label.

**How would you prove usefulness?**

Run a supervised pilot alongside an established monitoring protocol. Compare coordinator time per case, time to assignment, and the share of concerns with a documented follow-up against the existing process. Have a qualified reviewer assess appropriateness independently of Rill's own score. Track missed or deferred sites and the burden on volunteers. Predefine success and stopping criteria; do not count more closed tasks as proof of healthier water.

**Can it work with real data today?**

A real account starts empty. A coordinator can add verified sites, review coordinate candidates from the live OneAquaHealth directory, or map a compatible CSV/JSON import. Import validation keeps known demo data out of real workspaces and makes the importing coordinator accountable. A public-directory read is functioning; a production partnership or authenticated citizen-app integration is not claimed.

**What has actually been tested?**

The repository contains 75 logic/API/parser checks, ten end-to-end browser scenarios, and a verification record. They cover the decision loop, identity and workspace isolation, safe dispatch, retries, concurrent writes, imports/exports, and administration. Checked desktop/mobile surfaces have no reported axe violations or horizontal overflow. This is bounded software evidence, not external security certification or a field trial. Use the final verification record for current CI and deployment results.

**What prevents an unsafe volunteer dispatch?**

Hazardous reports and restricted sites are excluded from ordinary volunteer plans, and the server enforces the restriction on task creation and task updates. Fish distress receives a persistent authority-referral instruction. A coordinator can record qualified authority advice as an administrative recheck. The application does not confer training, permission, or emergency authority.

**What are the biggest limits before a real programme adopts it?**

The priority policy needs local expert review, the workflow needs field testing, and hosting needs verified backup and recovery. Offline recovery keys are implemented. Email verification, additional coordinators, and programme-scale operations remain rollout work. Losing both the password and recovery key leaves no email recovery path. Sites without reports also need routine coverage outside the concern-driven planner. We describe this as a working, hardened pilot application, not a validated environmental service.

**What did Shivam build?**

Shivam Gupta is the project creator and submission owner. The project was built with AI-assisted research, design, implementation, documentation, and testing. Describe any subsequent personal refinements or field work specifically and accurately. The entry stands on its working workflow and evidence, without inventing manual contributions, customers, or outcomes.
