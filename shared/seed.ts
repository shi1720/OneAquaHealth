import type { Observation, Site } from './types';

/** All locations and evidence below form a fictional training catchment around Coimbra. */
export const SCENARIO_SITES: Site[] = [
  {
    id: 'site-footbridge',
    name: 'Willow footbridge',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.2056,
    lng: -8.4291,
    description: 'Fictional urban stream reach beside a busy walking route.',
    habitat: 'Shaded urban channel',
    access: 'Observe from the public footbridge. Never climb down to the channel.',
    exposure: 5,
    walkMinutes: 30,
    lastCheckedAt: null,
    sensitive: false,
  },
  {
    id: 'site-upstream',
    name: 'Upstream gardens',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.2139,
    lng: -8.417,
    description: 'Fictional upstream comparison point along a garden path.',
    habitat: 'Riparian trees and riffles',
    access: 'Step-free public path; remain behind the bank edge.',
    exposure: 2,
    walkMinutes: 12,
    lastCheckedAt: null,
    sensitive: true,
  },
  {
    id: 'site-playground',
    name: 'Riverside playground',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.2007,
    lng: -8.4235,
    description: 'Fictional small tributary near a family recreation area.',
    habitat: 'Park stream and grass bank',
    access: 'Use the paved park path. Do not touch or collect unknown litter.',
    exposure: 5,
    walkMinutes: 25,
    lastCheckedAt: null,
    sensitive: false,
  },
  {
    id: 'site-market',
    name: 'Market culvert',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.2101,
    lng: -8.4295,
    description: 'Fictional road-drain outlet viewed from a public pavement.',
    habitat: 'Culverted urban reach',
    access: 'View from the pavement only. Never enter culverts or approach outlets.',
    exposure: 3,
    walkMinutes: 35,
    lastCheckedAt: null,
    sensitive: false,
  },
  {
    id: 'site-meadow',
    name: 'Meadow bend',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.1957,
    lng: -8.4178,
    description: 'Fictional slower-water reach alongside a meadow trail.',
    habitat: 'Reed margin and slow pool',
    access: 'Observe from the marked trail; avoid reed beds and nesting areas.',
    exposure: 2,
    walkMinutes: 18,
    lastCheckedAt: null,
    sensitive: true,
  },
  {
    id: 'site-school',
    name: 'School rain garden',
    catchment: 'Coimbra demonstration catchment',
    lat: 40.2181,
    lng: -8.4222,
    description: 'Fictional rain-garden overflow visible from a public path.',
    habitat: 'Planted drainage channel',
    access: 'Public perimeter path only; no entry to school grounds.',
    exposure: 4,
    walkMinutes: 30,
    lastCheckedAt: null,
    sensitive: false,
  },
];
export function seedScenario(now = new Date()): {
  sites: Site[];
  observations: Observation[];
  scenarioDate: string;
} {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  type Seed = Partial<Observation> &
    Pick<Observation, 'id' | 'siteId' | 'authorId' | 'authorName' | 'concerns' | 'notes'> & {
      hours: number;
    };
  const rows: Seed[] = [
    {
      id: 'obs-foam-1',
      siteId: 'site-footbridge',
      authorId: 'scenario-ana',
      authorName: 'Ana · scenario volunteer',
      concerns: ['foam'],
      confidence: 'unsure',
      notes:
        'A line of white foam collected below the footbridge this morning. I watched from the path. I cannot tell whether it is natural.',
      hours: 2,
    },
    {
      id: 'obs-foam-2',
      siteId: 'site-footbridge',
      authorId: 'scenario-miguel',
      authorName: 'Miguel · scenario volunteer',
      concerns: ['foam'],
      notes: 'Foam still visible at the same bend on my lunchtime walk. No approach to the water.',
      hours: 1,
    },
    {
      id: 'obs-foam-3',
      siteId: 'site-footbridge',
      authorId: 'scenario-inês',
      authorName: 'Inês · scenario volunteer',
      concerns: ['foam'],
      notes:
        'Small foam patches remain in the sheltered pool. Reported from the public bridge; source unknown.',
      hours: 0.5,
    },
    {
      id: 'obs-upstream',
      siteId: 'site-upstream',
      authorId: 'scenario-miguel',
      authorName: 'Miguel · scenario volunteer',
      concerns: ['clear', 'wildlife'],
      clarity: 'clear',
      notes:
        'No visible foam at the garden reach. A bird was feeding along the bank. A visual baseline only; water safety was not measured.',
      hours: 1.5,
    },
    {
      id: 'obs-litter',
      siteId: 'site-playground',
      authorId: 'scenario-leila',
      authorName: 'Leila · scenario volunteer',
      concerns: ['litter'],
      notes:
        'Several bottles and wrappers collected along the bank after a busy weekend. I left them untouched and stayed on the path.',
      hours: 4,
    },
    {
      id: 'obs-cloudy',
      siteId: 'site-market',
      authorId: 'scenario-joão',
      authorName: 'João · scenario volunteer',
      concerns: ['discoloration'],
      clarity: 'cloudy',
      confidence: 'unsure',
      notes:
        'Water looked brown after overnight rain. This could be sediment; I cannot establish a cause. Photo not available.',
      hours: 3,
    },
    {
      id: 'obs-meadow',
      siteId: 'site-meadow',
      authorId: 'scenario-ana',
      authorName: 'Ana · scenario volunteer',
      concerns: ['wildlife'],
      clarity: 'clear',
      flow: 'slow',
      notes:
        'Dragonflies seen from the meadow trail. No species identification attempted and no disturbance of the reeds.',
      hours: 26,
    },
    {
      id: 'obs-erosion',
      siteId: 'site-school',
      authorId: 'scenario-leila',
      authorName: 'Leila · scenario volunteer',
      concerns: ['erosion'],
      clarity: 'unsure',
      notes:
        'A small bare patch on the outer bank appears larger than on my last walk. Observation from the public path only.',
      hours: 22,
    },
  ];
  const observations: Observation[] = rows.map(({ hours, ...row }) => ({
    observedAt: ago(hours),
    createdAt: ago(hours),
    clarity: 'unsure',
    flow: 'steady',
    confidence: 'fairly_sure',
    photo: null,
    status: 'new',
    demo: true,
    revision: 1,
    ...row,
  }));
  const sites = SCENARIO_SITES.map((site) => ({
    ...site,
    lastCheckedAt:
      observations
        .filter((observation) => observation.siteId === site.id)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]?.observedAt ?? null,
  }));
  return { sites, observations, scenarioDate: now.toISOString() };
}
