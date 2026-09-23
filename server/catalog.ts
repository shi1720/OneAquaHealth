import { z } from 'zod';

export const ONEAQUAHEALTH_CATALOG_SOURCE = 'https://api.enora-oah.eu/api/sites/all';
export interface CatalogSite {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}
export interface SiteCatalog {
  source: string;
  retrievedAt: string;
  sites: CatalogSite[];
  notice: string;
}
const sourceSchema = z
  .array(
    z.object({
      code: z.string().min(1).max(80),
      name: z.string().max(200),
      city: z.object({ name: z.string().min(1).max(100) }),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  )
  .min(1)
  .max(2_000);

/** Fixed, read-only upstream with bounded response, timeout and ten-minute successful-response cache. */
export function createCatalogLoader(
  fetcher: typeof fetch = (...args) => fetch(...args),
  clock: () => number = Date.now,
) {
  let cached: SiteCatalog | undefined;
  let expires = 0;
  let pending: Promise<SiteCatalog> | undefined;
  return async (): Promise<SiteCatalog> => {
    if (cached && clock() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetcher(ONEAQUAHEALTH_CATALOG_SOURCE, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Rill/1.0 (OneAquaHealth hackathon; read-only site catalog)',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok || !response.body)
        throw new Error('OneAquaHealth site catalog is unavailable.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 1_000_000) {
          await reader.cancel();
          throw new Error('OneAquaHealth site catalog exceeded the response limit.');
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const rows = sourceSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
      const clean = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
      const sites = rows
        .map((row) => ({
          code: clean(row.code),
          name: clean(row.name) || clean(row.code),
          city: clean(row.city.name),
          lat: row.latitude,
          lng: row.longitude,
        }))
        .sort(
          (a, b) =>
            a.city.localeCompare(b.city) ||
            a.code.localeCompare(b.code, undefined, { numeric: true }),
        );
      cached = {
        source: ONEAQUAHEALTH_CATALOG_SOURCE,
        retrievedAt: new Date(clock()).toISOString(),
        sites,
        notice:
          'Live read-only OneAquaHealth site directory. Inclusion does not establish public access, safety, permission, or endorsement. A coordinator must verify local context before creating a monitoring site. Polygons and assessment results are not imported.',
      };
      expires = clock() + 10 * 60_000;
      return cached;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  };
}
export const loadOneAquaHealthCatalog = createCatalogLoader();
