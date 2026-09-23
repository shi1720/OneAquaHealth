# Decision engine performance check

Measured locally on 23 September 2026 with Node 22.16.0, an Apple M4 Pro, and macOS arm64. These are **synthetic in-process CPU measurements**, not production throughput, an API latency guarantee, or evidence of ecological benefit. Database reads, HTTP, serialization, concurrent users, and cold starts are excluded.

The reproducible fixtures contain 2,000 reports: distributed across 100 sites, concentrated at one site with mixed signals/times/accounts, and a dense case where all 2,000 distinct accounts report the same signal at the same site and time. The scenario clock is fixed at `2026-09-23T10:00:00Z`; the random seed is 1720. Each result is the median of seven measured invocations after one warm-up. All samples and extrema are in [the measurement record](engine-performance-results.json).

| Dataset                         | Workspace assessment, before → after | 120-minute plan, before → after | 480-minute plan, before → after |
| ------------------------------- | -----------------------------------: | ------------------------------: | ------------------------------: |
| 2,000 reports / 100 sites       |                52.776 → **1.373 ms** |           49.927 → **1.380 ms** |           50.120 → **2.500 ms** |
| 2,000 reports / one site, mixed |              484.366 → **38.180 ms** |         450.150 → **35.697 ms** |         445.383 → **35.417 ms** |
| 2,000 reports / one site, dense |             564.816 → **110.447 ms** |        561.687 → **111.358 ms** |        567.358 → **110.299 ms** |

The previous workspace loop rescanned all reports for every assessment and repeatedly parsed peer timestamps. The new explicit `assessWorkspace` batch function groups reports by site, parses timestamps once, and compares concern bit masks. The planner uses the same batch-scoped index and precomputes sites with open tasks. No workspace state is cached between requests. The scoring policy, evidence counts, rationale text, safety exclusions, ordering, exact knapsack allocation, and engine version are unchanged.

Within-site corroboration still performs pairwise comparisons: its worst-case time remains quadratic when every report belongs to one site. The documented bounds remain necessary. The dense result is deliberately retained rather than reporting only the faster distributed case. This measurement does not establish suitability for a host's CPU quota; measure that deployment separately before increasing limits or claiming an SLA.

## Correctness and budget preservation

Deep equality passed against the original engine for every assessment in all three 2,000-report fixtures, and for each complete plan at budgets of 20, 60, 120, 240, and 480 minutes. This compares explanation text, evidence, selected reports, ordering, and deferral reasons as well as scores. Every plan preserved its time budget, selected each site at most once, and accounted for every site as selected or deferred. For the 100-site fixture those budgets selected 1, 3, 6, 11, and 20 sites respectively; each one-site fixture selected one 20-minute visit throughout.

All 13 engine tests pass, including new batch/single-report equivalence checks at the 48-hour boundary, distinct-author and duplicate-ID handling, missing sites, resolved supporting evidence, and rebuilding the index after input changes. Existing tests retain exhaustive subset comparison, hazardous/restricted-site exclusions, completed/open tasks, and budget validation. Type checking passed.

## Reproduce

From the repository root, run `npx tsx scripts/benchmark-engine.ts` for current measurements and budget checks. To repeat the exact comparison:

```sh
git show 4ca8312884e37c8085b8117883a49604a99a55ac:shared/engine.ts > /tmp/rill-engine-before.ts
npx tsx scripts/benchmark-engine.ts /tmp/rill-engine-before.ts
npx vitest run tests/engine.test.ts
```

The original engine SHA-256 is `814616758b84931afe39812ab9b9f4e517eaa2eae6e2918125e4bc2f2c060854`. No shared database, live observations, or network services are used by the benchmark.
