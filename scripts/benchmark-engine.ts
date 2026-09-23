/** Local synthetic CPU measurements; no database, network, or environmental outcome claims. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpus, platform, arch } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as current from '../shared/engine';
import { seedScenario } from '../shared/seed';
import type { Assessment, Concern, Observation, Site } from '../shared/types';

const now = new Date('2026-09-23T10:00:00.000Z');
const base = seedScenario(now);
type Engine = typeof current & {
  assessWorkspace?: (sites: Site[], observations: Observation[], now: Date) => Assessment[];
};
const baselinePath = process.argv[2];
const baseline: Engine | undefined = baselinePath
  ? await import(pathToFileURL(resolve(baselinePath)).href)
  : undefined;

function fixture(siteCount: number, dense: boolean) {
  let state = 1720;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const sites = Array.from({ length: siteCount }, (_, index): Site => ({
    ...base.sites[0],
    id: `benchmark-site-${String(index).padStart(3, '0')}`,
    name: `Synthetic benchmark site ${index}`,
    exposure: index % 6,
    walkMinutes: 10 + (index % 11) * 5,
    sensitive: false,
  }));
  const signals: Concern[][] = [
    ['foam'],
    ['litter'],
    ['discoloration'],
    ['erosion'],
    ['algae'],
    ['clear'],
    ['foam', 'litter'],
    ['wildlife'],
  ];
  const observations = Array.from({ length: 2000 }, (_, index): Observation => ({
    ...base.observations[0],
    id: `benchmark-observation-${String(index).padStart(4, '0')}`,
    siteId: sites[index % sites.length].id,
    authorId: `synthetic-account-${dense ? index : Math.floor(random() * 400)}`,
    authorName: 'Synthetic benchmark account',
    concerns: dense ? ['foam'] : signals[Math.floor(random() * signals.length)],
    observedAt: dense
      ? now.toISOString()
      : new Date(now.getTime() - Math.floor(random() * 200) * 3_600_000).toISOString(),
    status: !dense && index % 13 === 0 ? 'resolved' : 'new',
    flow: 'steady',
    photo: null,
    notes: 'Synthetic performance fixture; no field observation was made.',
  }));
  return { sites, observations };
}

function assessments(engine: Engine, sites: Site[], observations: Observation[]) {
  if (engine.assessWorkspace) return engine.assessWorkspace(sites, observations, now);
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  return observations
    .filter((observation) => siteMap.has(observation.siteId))
    .map((observation) =>
      engine.assessObservation(observation, siteMap.get(observation.siteId)!, observations, now),
    );
}

function measure(run: () => unknown) {
  run(); // One untimed warm-up, then seven independent measured invocations.
  const times = Array.from({ length: 7 }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return {
    medianMs: Number(times[3].toFixed(3)),
    minMs: Number(times[0].toFixed(3)),
    maxMs: Number(times[6].toFixed(3)),
    samples: times.map((time) => Number(time.toFixed(3))),
  };
}

const cases = [];
for (const { siteCount, dense } of [
  { siteCount: 100, dense: false },
  { siteCount: 1, dense: false },
  { siteCount: 1, dense: true },
]) {
  const { sites, observations } = fixture(siteCount, dense);
  const expectedAssessments = assessments(current, sites, observations);
  const budgets = [20, 60, 120, 240, 480];
  const plans = budgets.map((budget) => {
    const plan = current.buildFieldPlan(sites, observations, [], budget, now);
    assert(plan.usedMinutes <= budget);
    assert.equal(
      plan.usedMinutes,
      plan.items.reduce((total, item) => total + item.minutes, 0),
    );
    assert.equal(new Set(plan.items.map((item) => item.siteId)).size, plan.items.length);
    assert.equal(plan.items.length + plan.deferred.length, sites.length);
    return plan;
  });
  if (baseline) {
    assert.deepEqual(expectedAssessments, assessments(baseline, sites, observations));
    for (const [index, budget] of budgets.entries())
      assert.deepEqual(plans[index], baseline.buildFieldPlan(sites, observations, [], budget, now));
  }
  const engines = baseline
    ? ([
        ['before', baseline],
        ['current', current],
      ] as const)
    : ([['current', current]] as const);
  const measurements = Object.fromEntries(
    engines.map(([name, engine]) => [
      name,
      {
        workspaceAssessment: measure(() => assessments(engine, sites, observations)),
        plan120: measure(() => engine.buildFieldPlan(sites, observations, [], 120, now)),
        plan480: measure(() => engine.buildFieldPlan(sites, observations, [], 480, now)),
      },
    ]),
  );
  cases.push({
    siteCount,
    distribution: dense
      ? 'dense matching signals and distinct accounts'
      : 'mixed signals, times and repeated accounts',
    observationCount: observations.length,
    measurements,
    outputSha256: createHash('sha256')
      .update(JSON.stringify({ expectedAssessments, plans }))
      .digest('hex'),
    exactBaselineMatch: baseline ? true : null,
    budgetChecks: plans.map((plan) => ({
      budget: plan.budgetMinutes,
      used: plan.usedMinutes,
      selected: plan.items.length,
      prioritySum: plan.items.reduce((sum, item) => sum + item.score, 0),
    })),
  });
}
console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      runtime: process.version,
      platform: `${platform()} ${arch()}`,
      cpu: cpus()[0]?.model,
      fixedScenarioTime: now.toISOString(),
      seed: 1720,
      rounds: 7,
      notes:
        'Synthetic local in-process CPU timing. Excludes network, database, serialization and concurrency. Not production throughput or environmental validation.',
      cases,
    },
    null,
    2,
  ),
);
