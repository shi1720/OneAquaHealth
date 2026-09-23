import { describe, expect, it } from 'vitest';
import { aggregateRateLimitsFromEnv, validateAggregateRateLimits } from '../server/rate-config';

describe('aggregate rate budget configuration', () => {
  it('provides modest shared-service defaults and accepts bounded explicit budgets', () => {
    expect(aggregateRateLimitsFromEnv({})).toEqual({
      authPer15Minutes: 240,
      demosPerHour: 60,
      recoveryPer15Minutes: 60,
      registrationsPerHour: 30,
    });
    expect(aggregateRateLimitsFromEnv({ RILL_AGGREGATE_DEMOS_PER_HOUR: '75' }).demosPerHour).toBe(
      75,
    );
    expect(
      aggregateRateLimitsFromEnv({ RILL_AGGREGATE_AUTH_PER_15_MINUTES: '1' }).authPer15Minutes,
    ).toBe(1);
  });
  it('fails startup for malformed, disabled, fractional, or excessive budgets', () => {
    for (const raw of ['', '0', '-1', '1.5', '1e2', ' 20', '20 ', 'NaN', 'Infinity', '1001'])
      expect(() =>
        aggregateRateLimitsFromEnv({ RILL_AGGREGATE_AUTH_PER_15_MINUTES: raw }),
      ).toThrow();
    for (const env of [
      { RILL_AGGREGATE_DEMOS_PER_HOUR: '501' },
      { RILL_AGGREGATE_RECOVERY_PER_15_MINUTES: '251' },
      { RILL_AGGREGATE_REGISTRATIONS_PER_HOUR: '101' },
    ])
      expect(() => aggregateRateLimitsFromEnv(env)).toThrow();
  });
  it('validates programmatic configuration and copies it to prevent later mutation', () => {
    const input = { ...aggregateRateLimitsFromEnv({}) };
    const validated = validateAggregateRateLimits(input);
    input.authPer15Minutes = 900;
    expect(validated.authPer15Minutes).toBe(240);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(() => validateAggregateRateLimits({ ...input, demosPerHour: Number.NaN })).toThrow();
  });
});
