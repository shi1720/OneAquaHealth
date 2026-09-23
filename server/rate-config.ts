/** Shared service budgets for deployments whose socket peer is a managed gateway. */
export interface AggregateRateLimits {
  authPer15Minutes: number;
  demosPerHour: number;
  recoveryPer15Minutes: number;
  registrationsPerHour: number;
}

const fields = {
  authPer15Minutes: { env: 'RILL_AGGREGATE_AUTH_PER_15_MINUTES', value: 240, max: 1000 },
  demosPerHour: { env: 'RILL_AGGREGATE_DEMOS_PER_HOUR', value: 60, max: 500 },
  recoveryPer15Minutes: { env: 'RILL_AGGREGATE_RECOVERY_PER_15_MINUTES', value: 60, max: 250 },
  registrationsPerHour: { env: 'RILL_AGGREGATE_REGISTRATIONS_PER_HOUR', value: 30, max: 100 },
} as const;

export function validateAggregateRateLimits(value: AggregateRateLimits): AggregateRateLimits {
  const result = {} as AggregateRateLimits;
  for (const name of Object.keys(fields) as (keyof AggregateRateLimits)[]) {
    const number = value[name];
    if (!Number.isSafeInteger(number) || number < 1 || number > fields[name].max)
      throw new Error(`${fields[name].env} must be an integer from 1 to ${fields[name].max}.`);
    result[name] = number;
  }
  return Object.freeze(result);
}

export function aggregateRateLimitsFromEnv(
  environment: Record<string, string | undefined>,
): AggregateRateLimits {
  const result = {} as AggregateRateLimits;
  for (const name of Object.keys(fields) as (keyof AggregateRateLimits)[]) {
    const raw = environment[fields[name].env];
    if (raw !== undefined && !/^[1-9]\d{0,5}$/.test(raw))
      throw new Error(`${fields[name].env} must be a positive decimal integer.`);
    result[name] = raw === undefined ? fields[name].value : Number(raw);
  }
  return validateAggregateRateLimits(result);
}
