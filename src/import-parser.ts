import type { Concern, ObservationInput } from '../shared/types';

export interface ImportRow {
  row: number;
  sourceSite: string;
  sourceName: string;
  sourceId: string;
  demo: boolean;
  input: Omit<ObservationInput, 'siteId' | 'clientId'>;
}
export interface ImportPreview {
  rows: ImportRow[];
  errors: string[];
  sourceDemo: boolean;
  provenanceKnown: boolean;
  warnings: string[];
}
const concerns = new Set<Concern>([
  'foam',
  'discoloration',
  'litter',
  'odour',
  'dead_fish',
  'algae',
  'erosion',
  'wildlife',
  'clear',
]);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const scalar = (value: unknown): string => (typeof value === 'string' ? value : '');

/** RFC 4180-style CSV: quoted separators/newlines, escaped quotes, BOM, LF or CRLF. Never evaluates cells. */
export function parseCSV(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    afterQuote = false;
  const endField = () => {
    row.push(field);
    field = '';
    afterQuote = false;
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else field += char;
      continue;
    }
    if (char === ',') {
      endField();
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRow();
      continue;
    }
    if (afterQuote)
      throw new Error('Unexpected text after a closing CSV quote. Use commas between fields.');
    if (char === '"') {
      if (field !== '')
        throw new Error(
          'A CSV quote must start a field. Double embedded quotes inside quoted fields.',
        );
      quoted = true;
    } else field += char;
  }
  if (quoted) throw new Error('The CSV ends inside a quoted field. Check its closing quote.');
  if (field !== '' || row.length || afterQuote) endRow();
  return rows;
}

export function parseImport(source: string, filename: string, now = new Date()): ImportPreview {
  if (source.length > 1_000_000)
    throw new Error('Choose a CSV or JSON file smaller than 1 MB. Photos are not imported.');
  let items: unknown[],
    sourceDemo = false,
    provenanceKnown = false;
  const siteNames = new Map<string, string>();
  if (filename.toLowerCase().endsWith('.csv')) {
    const table = parseCSV(source);
    if (table.length < 2) throw new Error('The CSV needs a header and at least one observation.');
    const headers = table[0].map((value) => value.trim());
    if (new Set(headers).size !== headers.length || headers.some((value) => !value))
      throw new Error('CSV headers must be unique and non-empty.');
    items = table.slice(1).map((cells, index) => {
      if (cells.length !== headers.length)
        throw new Error(
          `CSV row ${index + 2} has ${cells.length} fields; the header has ${headers.length}.`,
        );
      return Object.fromEntries(headers.map((header, i) => [header, cells[i]]));
    });
  } else if (filename.toLowerCase().endsWith('.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source.replace(/^\uFEFF/, ''));
    } catch {
      throw new Error('This file is not valid JSON. Export it again or check its syntax.');
    }
    if (Array.isArray(parsed)) items = parsed;
    else if (record(parsed) && Array.isArray(parsed.observations)) {
      items = parsed.observations;
      sourceDemo =
        (record(parsed.workspace) && parsed.workspace.demo === true) ||
        parsed.sourceDemo === true ||
        /synthetic|demonstration/i.test(scalar(parsed.dataLabel));
      provenanceKnown = record(parsed.workspace) && typeof parsed.workspace.demo === 'boolean';
      if (Array.isArray(parsed.sites))
        for (const site of parsed.sites)
          if (record(site) && typeof site.id === 'string' && typeof site.name === 'string')
            siteNames.set(site.id, site.name);
    } else
      throw new Error(
        'Use a Rill workspace JSON export or a JSON array of observations. FHIR and GeoJSON are not observation imports.',
      );
  } else throw new Error('Choose a .csv or .json file.');
  if (!items.length || items.length > 100)
    throw new Error(
      'Import between 1 and 100 observations per file. No rows were selected or imported.',
    );
  const rows: ImportRow[] = [],
    errors: string[] = [];
  let allRowsLabelled = true;
  for (let index = 0; index < items.length; index++) {
    const rowNumber = index + 1,
      item = items[index];
    if (!record(item)) {
      errors.push(`Observation ${rowNumber}: expected an object.`);
      continue;
    }
    const problems: string[] = [];
    const sourceSite = scalar(item.siteId ?? item.site_id ?? item.site_name).trim();
    const sourceName = scalar(item.site_name) || siteNames.get(sourceSite) || sourceSite;
    const observedAt = scalar(item.observedAt ?? item.observed_at);
    const selected = Array.isArray(item.concerns)
      ? item.concerns
      : scalar(item.concerns)
          .split(';')
          .map((value) => value.trim());
    const clarity = scalar(item.clarity),
      flow = scalar(item.flow),
      confidence = scalar(item.confidence ?? item.observer_confidence);
    const notes = scalar(item.notes);
    const label = scalar(item.data_label ?? item.dataLabel);
    const demo = sourceDemo || item.demo === true || /synthetic|demonstration/i.test(label);
    if (!(
      typeof item.demo === 'boolean' || /^(user[ -]reported|synthetic demonstration)$/i.test(label)
    ))
      allRowsLabelled = false;
    if (demo) sourceDemo = true;
    if (!sourceSite || sourceSite.length > 200)
      problems.push('a source site_id/siteId or site_name is required');
    const dateParts =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
        observedAt,
      );
    const calendarDay = dateParts
      ? new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])))
      : null;
    const validDay =
      !!dateParts &&
      calendarDay?.getUTCMonth() === Number(dateParts[2]) - 1 &&
      calendarDay?.getUTCDate() === Number(dateParts[3]) &&
      Number(dateParts[4]) < 24 &&
      Number(dateParts[5]) < 60 &&
      Number(dateParts[6]) < 60;
    if (!validDay || !Number.isFinite(Date.parse(observedAt)))
      problems.push('observed_at must be a valid date with seconds and timezone');
    else if (
      Date.parse(observedAt) > now.getTime() + 300_000 ||
      Date.parse(observedAt) < now.getTime() - 365 * 86400000
    )
      problems.push(
        'observation time must be within the last year and no more than five minutes ahead',
      );
    if (
      !selected.length ||
      selected.some((value) => typeof value !== 'string' || !concerns.has(value as Concern)) ||
      new Set(selected).size !== selected.length
    )
      problems.push('concerns must contain unique supported codes separated by semicolons');
    if (
      selected.includes('clear') &&
      selected.some((value) => value !== 'clear' && value !== 'wildlife')
    )
      problems.push('no visible concern cannot be combined with a concern');
    if (!['clear', 'cloudy', 'opaque', 'unsure'].includes(clarity))
      problems.push('clarity must be clear, cloudy, opaque, or unsure');
    if (!['still', 'slow', 'steady', 'fast', 'unsure'].includes(flow))
      problems.push('flow must be still, slow, steady, fast, or unsure');
    if (!['unsure', 'fairly_sure', 'certain'].includes(confidence))
      problems.push('observer confidence must be unsure, fairly_sure, or certain');
    if (notes.trim().length < 8 || notes.trim().length > 2000)
      problems.push('notes must contain 8–2,000 characters');
    if (problems.length) errors.push(`Observation ${rowNumber}: ${problems.join('; ')}.`);
    else
      rows.push({
        row: rowNumber,
        sourceSite,
        sourceName,
        sourceId: scalar(item.id ?? item.observation_id),
        demo,
        input: {
          observedAt: new Date(observedAt).toISOString(),
          concerns: selected as Concern[],
          clarity: clarity as ObservationInput['clarity'],
          flow: flow as ObservationInput['flow'],
          confidence: confidence as ObservationInput['confidence'],
          notes,
          photo: null,
        },
      });
  }
  return {
    rows,
    errors,
    sourceDemo,
    provenanceKnown: provenanceKnown || allRowsLabelled,
    warnings: [
      'Original observer identity, review states, photos, tasks, and previous decisions are not imported. You become the accountable importing author; every record starts awaiting review.',
      'CSV text is kept as text, including any protective apostrophe used by a spreadsheet export. No formulas are executed.',
    ],
  };
}

/** Stable content-and-destination keys make repeat imports safe without trusting external client identifiers. */
export async function prepareImport(
  preview: ImportPreview,
  mapping: Record<string, string>,
): Promise<{ observations: (ObservationInput & { demo: boolean })[]; duplicates: number }> {
  const unique = new Map<string, ObservationInput & { demo: boolean }>();
  for (const row of preview.rows) {
    const siteId = mapping[row.sourceSite];
    if (typeof siteId !== 'string' || !siteId)
      throw new Error(`Choose a destination for ${row.sourceName}.`);
    const material = JSON.stringify({
      sourceId: row.sourceId,
      sourceSite: row.sourceSite,
      siteId,
      ...row.input,
      demo: row.demo,
    });
    const bytes = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material)),
    );
    const clientId = `import_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
    unique.set(clientId, { ...row.input, siteId, clientId, demo: row.demo });
  }
  return { observations: [...unique.values()], duplicates: preview.rows.length - unique.size };
}
