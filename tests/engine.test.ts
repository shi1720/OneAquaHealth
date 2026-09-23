import { describe, expect, it } from 'vitest';
import { assessObservation, buildFieldPlan, unsafeForVolunteer } from '../shared/engine';
import { seedScenario } from '../shared/seed';
import type { FieldTask, Observation, Site } from '../shared/types';

const now = new Date('2026-09-23T10:00:00Z');
const seeded = seedScenario(now);
const site = seeded.sites[0];
function observation(overrides: Partial<Observation> = {}): Observation {
  return { ...seeded.observations[0], ...overrides };
}

describe('explainable follow-up priority', () => {
  it('does not promote clear water or wildlife reports through public access, confidence, or photo', () => {
    const report = observation({
      concerns: ['clear', 'wildlife'],
      confidence: 'certain',
      photo: 'image',
    });
    const result = assessObservation(report, site, [report], now);
    expect(result.score).toBe(0);
    expect(result.priority).toBe('routine');
    expect(result.suggestedAction).toContain('not evidence that the water is safe');
  });
  it('exposes weights, separates evidence from urgency, and never treats confidence as certainty', () => {
    const report = observation({ confidence: 'unsure' });
    const result = assessObservation(report, site, [report], now);
    expect(result.score).toBe(result.reasons.reduce((sum, item) => sum + item.points, 0));
    expect(result.evidence).toBe('limited');
    expect(result.priority).toBe('high');
    expect(result.cautions.join(' ')).toContain('unsure');
    expect(result.cautions.join(' ')).toContain('naturally');
  });
  it('counts only distinct other accounts at the same site with matching signals within 48 hours', () => {
    const report = observation();
    const reports = [
      report,
      observation({ id: 'same-author' }),
      observation({ id: 'match-1', authorId: 'second' }),
      observation({ id: 'duplicate-second', authorId: 'second' }),
      observation({ id: 'wrong-site', authorId: 'third', siteId: 'other' }),
      observation({ id: 'clear', authorId: 'fourth', concerns: ['clear'] }),
      observation({ id: 'old', authorId: 'fifth', observedAt: '2026-09-18T10:00:00Z' }),
    ];
    const result = assessObservation(report, site, reports, now);
    expect(result.corroboratingCount).toBe(1);
    expect(result.evidence).toBe('developing');
    expect(
      assessObservation(
        report,
        site,
        [...reports, observation({ id: 'match-2', authorId: 'sixth' })],
        now,
      ).evidence,
    ).toBe('corroborated');
  });
  it('retains immediate authority referral for fish mortality even if evidence is old or uncertain', () => {
    const report = observation({
      concerns: ['dead_fish'],
      confidence: 'unsure',
      observedAt: '2026-09-01T10:00:00Z',
    });
    const result = assessObservation(report, site, [report], now);
    expect(result.priority).toBe('urgent');
    expect(result.evidence).toBe('limited');
    expect(result.suggestedAction).toContain('immediately');
    expect(unsafeForVolunteer(report)).toContain('Do not wait');
  });
  it('decays the recency contribution and preserves the signal and uncertainty', () => {
    const report = observation(),
      older = observation({ observedAt: '2026-09-10T10:00:00Z' });
    expect(
      assessObservation(report, site, [report], now).score -
        assessObservation(older, site, [older], now).score,
    ).toBe(10);
  });
});

describe('exact safe field plan', () => {
  it('honours the budget, selects each site once, and covers all deferred sites', () => {
    for (let budget = 20; budget <= 480; budget += 10) {
      const plan = buildFieldPlan(seeded.sites, seeded.observations, [], budget, now);
      expect(plan.usedMinutes).toBeLessThanOrEqual(budget);
      expect(plan.usedMinutes).toBe(plan.items.reduce((sum, item) => sum + item.minutes, 0));
      expect(new Set(plan.items.map((item) => item.siteId)).size).toBe(plan.items.length);
      expect(plan.items.length + plan.deferred.length).toBe(seeded.sites.length);
    }
  });
  it('finds the global optimum against exhaustive subset enumeration', () => {
    const sites: Site[] = seeded.sites.slice(0, 4).map((item, index) => ({
      ...item,
      walkMinutes: [35, 15, 10, 20][index],
      exposure: index,
      sensitive: false,
    }));
    const reports = sites.map((item, index) =>
      observation({
        id: `obs-${index}`,
        siteId: item.id,
        concerns: ['foam'],
        authorId: `author-${index}`,
      }),
    );
    for (let budget = 20; budget < 125; budget += 5) {
      const values = sites.map(
        (item, index) => assessObservation(reports[index], item, reports, now).score,
      );
      let optimum = 0;
      for (let mask = 0; mask < 16; mask++) {
        let cost = 0,
          value = 0;
        sites.forEach((item, index) => {
          if (mask & (1 << index)) {
            cost += item.walkMinutes + 10;
            value += values[index];
          }
        });
        if (cost <= budget) optimum = Math.max(optimum, value);
      }
      const plan = buildFieldPlan(sites, reports, [], budget, now);
      expect(plan.items.reduce((sum, item) => sum + item.score, 0)).toBe(optimum);
    }
  });
  it('blocks the entire site if any unresolved observation has hazardous signs', () => {
    const reports = [
      ...seeded.observations,
      observation({ id: 'hazard', concerns: ['dead_fish'] }),
    ];
    const plan = buildFieldPlan(seeded.sites, reports, [], 480, now);
    expect(plan.items.some((item) => item.siteId === site.id)).toBe(false);
    expect(plan.deferred.find((item) => item.siteId === site.id)?.reason).toContain('authority');
    expect(
      buildFieldPlan(
        seeded.sites,
        [...seeded.observations, observation({ id: 'fast', flow: 'fast' })],
        [],
        480,
        now,
      ).items.some((item) => item.siteId === site.id),
    ).toBe(false);
  });
  it('excludes sites with open tasks, permits completed ones, and ignores resolved incidents', () => {
    const task: FieldTask = {
      id: 'task',
      observationId: seeded.observations[0].id,
      siteId: site.id,
      title: 'Verify from path',
      kind: 'verify',
      status: 'planned',
      assignedTo: 'Shivam Gupta',
      dueAt: now.toISOString(),
      createdAt: now.toISOString(),
      completedAt: null,
      result: null,
      estimatedMinutes: 25,
    };
    expect(
      buildFieldPlan(seeded.sites, seeded.observations, [task], 480, now).items.some(
        (item) => item.siteId === site.id,
      ),
    ).toBe(false);
    expect(
      buildFieldPlan(
        seeded.sites,
        seeded.observations,
        [{ ...task, status: 'completed' }],
        480,
        now,
      ).items.some((item) => item.siteId === site.id),
    ).toBe(true);
    expect(
      buildFieldPlan(
        seeded.sites,
        seeded.observations.map((item) => ({ ...item, status: 'resolved' })),
        [],
        480,
        now,
      ).items,
    ).toEqual([]);
  });
  it('excludes sensitive or restricted sites even when a visible concern is present', () => {
    const sensitiveSite = { ...site, sensitive: true };
    const plan = buildFieldPlan([sensitiveSite], [observation()], [], 480, now);
    expect(plan.items).toEqual([]);
    expect(plan.deferred[0].reason).toContain('Sensitive or restricted');
  });
  it('is deterministic regardless of site input order and rejects invalid budgets', () => {
    expect(buildFieldPlan(seeded.sites, seeded.observations, [], 60, now)).toEqual(
      buildFieldPlan([...seeded.sites].reverse(), seeded.observations, [], 60, now),
    );
    for (const budget of [0, 19, 481, 20.5, NaN])
      expect(() => buildFieldPlan(seeded.sites, seeded.observations, [], budget, now)).toThrow();
  });
});
