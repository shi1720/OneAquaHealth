import { describe, expect, it } from 'vitest';
import { parseCSV, parseImport, prepareImport } from '../src/import-parser';
import { exportCSV, exportJSON } from '../server/export';
import { seedScenario } from '../shared/seed';
import type { WorkspaceData } from '../shared/types';

const now = new Date('2026-09-23T10:00:00Z');
const base = {
  id: 'external-one',
  siteId: 'external-bank',
  observedAt: now.toISOString(),
  concerns: ['litter'],
  clarity: 'unsure',
  flow: 'steady',
  confidence: 'unsure',
  notes: 'Bottles on the bank, observed from a safe path.',
};
function parse(rows: unknown[]) {
  return parseImport(JSON.stringify(rows), 'input.json', now);
}
function demoData(): WorkspaceData {
  const seeded = seedScenario(now);
  return {
    ...seeded,
    user: {
      id: 'reviewer',
      name: 'Reviewer',
      email: 'reviewer@example.test',
      role: 'coordinator',
      workspaceId: 'test',
      workspaceName: 'Test',
      isDemo: true,
    },
    tasks: [],
    activity: [],
    assessments: [],
    engineVersion: 'test',
  };
}

describe('CSV parsing without formula interpretation', () => {
  it('reads BOM, CRLF, commas, multiline notes, escaped quotes and an empty final field', () => {
    expect(
      parseCSV('\uFEFFsite,notes,optional\r\nbank,"Saw ""bottles"", then\r\nleft safely",\r\n'),
    ).toEqual([
      ['site', 'notes', 'optional'],
      ['bank', 'Saw "bottles", then\r\nleft safely', ''],
    ]);
  });
  it('keeps formula-looking cells literal and does not remove protective apostrophes', () => {
    expect(parseCSV("a,b,c\n=SUM(1),'+dangerous,@notice")).toEqual([
      ['a', 'b', 'c'],
      ['=SUM(1)', "'+dangerous", '@notice'],
    ]);
  });
  it('rejects broken quote boundaries instead of guessing the data', () => {
    for (const input of ['a\n"unterminated', 'a\nword"quote', 'a\n"closed"tail'])
      expect(() => parseCSV(input)).toThrow();
  });
  it('rejects duplicate headers and inconsistent row widths', () => {
    expect(() => parseImport('site_id,site_id\na,b', 'file.csv', now)).toThrow('unique');
    expect(() => parseImport('site_id,notes\na,b,c', 'file.csv', now)).toThrow('fields');
  });
});
describe('evidence import validation and provenance', () => {
  it('roundtrips actual Rill CSV and JSON exports without importing review states or authors', () => {
    const data = demoData();
    for (const [content, name] of [
      [exportCSV(data), 'rill.csv'],
      [JSON.stringify(exportJSON(data, now)), 'rill.json'],
    ]) {
      const preview = parseImport(content, name, now);
      expect(preview.errors).toEqual([]);
      expect(preview.rows).toHaveLength(8);
      expect(preview.sourceDemo).toBe(true);
      expect(preview.rows.every((row) => row.demo)).toBe(true);
      expect(preview.provenanceKnown).toBe(true);
      expect(preview.rows[0].input).not.toHaveProperty('authorName');
      expect(preview.rows[0].input).not.toHaveProperty('status');
    }
  });
  it('keeps source site identity explicit and rejects missing or contradictory fields', () => {
    const preview = parse([
      { ...base, siteId: undefined },
      { ...base, concerns: ['clear', 'litter'] },
      { ...base, concerns: ['litter', 'litter'] },
      { ...base, confidence: 'very confident' },
    ]);
    expect(preview.errors).toHaveLength(4);
    expect(preview.rows).toEqual([]);
  });
  it('requires an explicit timezone, valid calendar day, and bounded time window', () => {
    for (const observedAt of [
      '2026-09-23T10:00:00',
      '2026-02-30T10:00:00Z',
      '2026-09-23T24:00:00Z',
      '2026-09-23T10:06:00Z',
      '2024-09-23T10:00:00Z',
    ])
      expect(parse([{ ...base, observedAt }]).errors).toHaveLength(1);
    expect(
      parse([{ ...base, observedAt: '2026-09-23T15:30:00+05:30' }]).rows[0].input.observedAt,
    ).toBe(now.toISOString());
  });
  it('carries synthetic flags from workspace or individual records and flags unknown provenance', () => {
    expect(parse([base]).provenanceKnown).toBe(false);
    expect(parse([{ ...base, demo: false }]).provenanceKnown).toBe(true);
    expect(
      parse([
        { ...base, demo: false },
        { ...base, id: 'two', demo: true },
      ]).sourceDemo,
    ).toBe(true);
    expect(
      parseImport(
        JSON.stringify({ workspace: { demo: true }, observations: [base] }),
        'demo.json',
        now,
      ).rows[0].demo,
    ).toBe(true);
  });
  it('rejects oversized batches/files and unsupported formats without silently taking a subset', () => {
    expect(() => parse(Array.from({ length: 101 }, () => base))).toThrow('100');
    expect(() => parseImport(' '.repeat(1_000_001), 'file.csv', now)).toThrow('1 MB');
    expect(() => parseImport('{"resourceType":"Bundle"}', 'file.json', now)).toThrow('FHIR');
    expect(() => parseImport('whatever', 'file.xlsx', now)).toThrow('.csv');
  });
  it('preserves formula-like and quoted notes as text', () => {
    const note = '=HYPERLINK("https://example.invalid","literal note")';
    expect(parse([{ ...base, notes: note }]).rows[0].input.notes).toBe(note);
  });
  it('generates stable retry keys, deduplicates identical rows, and separates destinations', async () => {
    const preview = parse([base, base]);
    const one = await prepareImport(preview, { 'external-bank': 'local-bank' });
    const two = await prepareImport(preview, { 'external-bank': 'local-bank' });
    const other = await prepareImport(preview, { 'external-bank': 'different-bank' });
    expect(one.duplicates).toBe(1);
    expect(one.observations).toHaveLength(1);
    expect(one.observations[0].clientId).toMatch(/^import_[0-9a-f]{64}$/);
    expect(one.observations[0].clientId).toBe(two.observations[0].clientId);
    expect(one.observations[0].clientId).not.toBe(other.observations[0].clientId);
    await expect(prepareImport(preview, {})).rejects.toThrow('destination');
    await expect(prepareImport(parse([{ ...base, siteId: '__proto__' }]), {})).rejects.toThrow(
      'destination',
    );
  });
});
