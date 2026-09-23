import type {
  Assessment,
  Concern,
  FieldPlan,
  FieldTask,
  Observation,
  PlanItem,
  Reason,
  Site,
} from './types';

/** A transparent operational heuristic, not an ecological index or calibrated risk model. */
export const ENGINE_VERSION = 'rill-rules-1.0.0';
export const CONCERN_LABELS: Record<Concern, string> = {
  foam: 'Persistent foam',
  discoloration: 'Unusual water colour',
  litter: 'Litter',
  odour: 'Unusual smell',
  dead_fish: 'Dead or distressed fish',
  algae: 'Algal growth',
  erosion: 'Bank erosion',
  wildlife: 'Wildlife sighting',
  clear: 'No visible concern',
};
const SEVERITY: Record<Concern, number> = {
  dead_fish: 60,
  odour: 30,
  discoloration: 28,
  algae: 26,
  foam: 24,
  erosion: 20,
  litter: 16,
  wildlife: 0,
  clear: 0,
};
const HOUR = 3_600_000;
const isConcern = (concern: Concern) => SEVERITY[concern] > 0;
const CONCERN_BITS: Record<Concern, number> = {
  foam: 1,
  discoloration: 2,
  litter: 4,
  odour: 8,
  dead_fish: 16,
  algae: 32,
  erosion: 64,
  wildlife: 0,
  clear: 0,
};
interface IndexedObservation {
  observation: Observation;
  observedMs: number;
  signalMask: number;
}
function indexObservations(observations: Observation[]) {
  const bySite = new Map<string, IndexedObservation[]>();
  const entries = observations.map((observation) => {
    const entry = {
      observation,
      observedMs: new Date(observation.observedAt).getTime(),
      signalMask: observation.concerns.reduce((mask, concern) => mask | CONCERN_BITS[concern], 0),
    };
    const group = bySite.get(observation.siteId);
    if (group) group.push(entry);
    else bySite.set(observation.siteId, [entry]);
    return entry;
  });
  return { bySite, entries };
}

/** Batch-scoped index only: never retain or cache mutable workspace data across calls. */
function assessIndexed(
  entry: IndexedObservation,
  site: Site,
  peers: IndexedObservation[],
  nowMs: number,
): Assessment {
  const authors = new Set<string>();
  if (entry.signalMask) {
    for (const peer of peers) {
      if (
        peer.observation.id !== entry.observation.id &&
        peer.observation.authorId !== entry.observation.authorId &&
        (entry.signalMask & peer.signalMask) !== 0 &&
        Math.abs(peer.observedMs - entry.observedMs) <= 48 * HOUR
      )
        authors.add(peer.observation.authorId);
    }
  }
  return assessFromFacts(entry.observation, site, nowMs, entry.observedMs, authors.size);
}

/** Assess a complete workspace with timestamps and site groups prepared once. Input order is retained. */
export function assessWorkspace(
  sites: Site[],
  observations: Observation[],
  now: Date | string = new Date(),
): Assessment[] {
  const nowMs = new Date(now).getTime();
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  const index = indexObservations(observations);
  return index.entries
    .filter((entry) => siteMap.has(entry.observation.siteId))
    .map((entry) =>
      assessIndexed(
        entry,
        siteMap.get(entry.observation.siteId)!,
        index.bySite.get(entry.observation.siteId)!,
        nowMs,
      ),
    );
}
export function unsafeForVolunteer(observation: Observation): string | null {
  if (observation.concerns.includes('dead_fish'))
    return 'Dead or distressed fish: notify the local environmental authority now. Do not wait for a field plan, enter the water, handle fish, or send volunteers.';
  if (observation.flow === 'fast')
    return 'Fast water: do not dispatch volunteers. A coordinator must confirm safe access or refer to the appropriate authority.';
  if (observation.concerns.includes('odour'))
    return 'Unusual odour: avoid approaching or investigating the source. Coordinator assessment is required before any volunteer visit.';
  return null;
}
export function assessObservation(
  observation: Observation,
  site: Site,
  observations: Observation[],
  now: Date | string = new Date(),
): Assessment {
  const nowMs = new Date(now).getTime();
  const observedMs = new Date(observation.observedAt).getTime();
  const concerns = observation.concerns.filter(isConcern);
  // Count distinct accounts, not posts. Account independence is not verified identity.
  const otherAuthors = new Set(
    observations
      .filter(
        (other) =>
          other.id !== observation.id &&
          other.siteId === observation.siteId &&
          other.authorId !== observation.authorId &&
          Math.abs(new Date(other.observedAt).getTime() - observedMs) <= 48 * HOUR &&
          other.concerns.some((concern) => concerns.includes(concern)),
      )
      .map((other) => other.authorId),
  );
  return assessFromFacts(observation, site, nowMs, observedMs, otherAuthors.size);
}

function assessFromFacts(
  observation: Observation,
  site: Site,
  nowMs: number,
  observedMs: number,
  corroboratingCount: number,
): Assessment {
  const ageHours = Math.max(0, (nowMs - observedMs) / HOUR);
  const concerns = observation.concerns.filter(isConcern);
  const base = Math.max(0, ...concerns.map((concern) => SEVERITY[concern]));
  const evidence: Assessment['evidence'] =
    corroboratingCount >= 2
      ? 'corroborated'
      : corroboratingCount >= 1 || (observation.photo && observation.confidence !== 'unsure')
        ? 'developing'
        : 'limited';
  const reasons: Reason[] = [
    {
      label: 'Reported signal',
      points: base,
      detail: base
        ? `Highest-weight signal: ${CONCERN_LABELS[concerns.sort((a, b) => SEVERITY[b] - SEVERITY[a])[0]]}. This describes what was reported, not a confirmed cause.`
        : 'A clear-water or wildlife report alone does not establish water safety or create an incident.',
    },
  ];
  if (base > 0) {
    reasons.push({
      label: 'Distinct observer support',
      points: Math.min(15, corroboratingCount * 5),
      detail: `${corroboratingCount} other account${corroboratingCount === 1 ? '' : 's'} reported a matching concern at this site within 48 hours. Accounts are not verified independent identities.`,
    });
    reasons.push({
      label: 'Public access context',
      points: Math.max(0, Math.min(15, site.exposure * 3)),
      detail: `Site context level ${site.exposure}/5 reflects nearby public access, not measured exposure or illness risk.`,
    });
    reasons.push({
      label: 'Recency',
      points: ageHours <= 24 ? 10 : ageHours <= 72 ? 6 : ageHours <= 168 ? 2 : 0,
      detail:
        ageHours <= 24
          ? 'Reported in the last 24 hours.'
          : `Reported ${Math.floor(ageHours / 24)} day(s) ago; conditions may have changed.`,
    });
    reasons.push({
      label: 'Evidence gap',
      points: evidence === 'limited' ? 6 : evidence === 'developing' ? 3 : 0,
      detail:
        evidence === 'limited'
          ? 'Limited evidence makes a safe second observation useful; uncertainty is not proof of harm.'
          : 'Matching reports reduce the information gap but cannot identify pollutants.',
    });
    reasons.push({
      label: 'Multiple signals',
      points: Math.min(6, Math.max(0, concerns.length - 1) * 3),
      detail: `${concerns.length} distinct concern type(s). Repeated selection never adds weight.`,
    });
  }
  const score = Math.min(
    100,
    reasons.reduce((sum, reason) => sum + reason.points, 0),
  );
  const urgent = observation.concerns.includes('dead_fish');
  const priority: Assessment['priority'] = urgent
    ? 'urgent'
    : score >= 50
      ? 'high'
      : score >= 25
        ? 'medium'
        : 'routine';
  const cautions = [
    'Visual observations cannot determine drinking, bathing, or animal-contact safety. No pathogen, pollutant, or health diagnosis is made.',
  ];
  if (observation.concerns.includes('foam'))
    cautions.push(
      'Foam can occur naturally or from human activity. Appearance alone cannot establish its source.',
    );
  if (observation.concerns.includes('algae'))
    cautions.push(
      'Visible algae do not establish toxicity. Avoid contact and follow local authority advice.',
    );
  if (ageHours > 72)
    cautions.push(
      'This observation is more than 72 hours old. Verify current conditions before an operational decision.',
    );
  if (observation.confidence === 'unsure')
    cautions.push(
      'The observer marked this report as unsure. Retain that uncertainty during review.',
    );
  if (site.sensitive)
    cautions.push('Sensitive habitat: observe from the public path and do not disturb wildlife.');
  const hazard = unsafeForVolunteer(observation);
  if (hazard) cautions.unshift(hazard);
  const suggestedAction = urgent
    ? 'Notify the local environmental authority immediately. Record the referral; do not wait for verification and do not send volunteers.'
    : hazard
      ? 'Coordinator review required before any visit. Keep people away from unsafe access and consult the appropriate authority.'
      : base === 0
        ? 'Retain as a baseline observation. Continue routine monitoring; this is not evidence that the water is safe.'
        : 'Ask a second observer to look from a safe public path. Compare an upstream location if accessible, record what changed, and let the coordinator decide the next action.';
  const question = observation.concerns.includes('foam')
    ? 'From the path, is the foam persistent in still water, and can you see a similar pattern upstream?'
    : observation.concerns.includes('discoloration')
      ? 'From a safe viewpoint, is the colour different upstream, and was there recent rain?'
      : urgent
        ? 'Has the local environmental authority been informed? Record when and the advice received.'
        : observation.concerns.includes('litter')
          ? 'Can you describe the litter from the path without touching it? Leave sharp or unknown materials to trained staff.'
          : 'What can a second observer safely verify from the public path, and what evidence would change the next decision?';
  return {
    observationId: observation.id,
    score,
    priority,
    evidence,
    reasons,
    cautions,
    suggestedAction,
    question,
    corroboratingCount,
    oneHealth: {
      environment: base
        ? 'Document visible change and its location. A qualified assessment is needed to establish ecological effects or causes.'
        : 'A repeatable baseline helps distinguish future changes; a single sighting is not a biodiversity index.',
      animals: urgent
        ? 'Reported fish distress warrants prompt authority referral. Do not touch animals or enter the water.'
        : 'Observe wildlife without disturbance. Keep pets away from water with visible concerns; no animal-health diagnosis is inferred.',
      people:
        site.exposure >= 4
          ? 'Public access makes a timely, clearly qualified update useful. Only competent authorities can issue contact-safety advice.'
          : 'Share evidence and uncertainty with the coordinator so community action is proportionate and safe.',
    },
    version: ENGINE_VERSION,
  };
}

/** Exact 0/1 knapsack over one eligible observation per site. Costs are independent visit estimates, not routing. */
export function buildFieldPlan(
  sites: Site[],
  observations: Observation[],
  tasks: FieldTask[],
  budgetMinutes: number,
  now: Date | string = new Date(),
): FieldPlan {
  if (!Number.isInteger(budgetMinutes) || budgetMinutes < 20 || budgetMinutes > 480)
    throw new Error('Budget must be an integer from 20 to 480 minutes.');
  const deferred: FieldPlan['deferred'] = [];
  const candidates: Omit<PlanItem, 'rank'>[] = [];
  const index = indexObservations(observations);
  const nowMs = new Date(now).getTime();
  const sitesWithOpenTasks = new Set(
    tasks.filter((task) => task.status !== 'completed').map((task) => task.siteId),
  );
  for (const site of [...sites].sort((a, b) => a.id.localeCompare(b.id))) {
    const peers = index.bySite.get(site.id) ?? [];
    const unresolved = peers.filter((entry) => entry.observation.status !== 'resolved');
    const hazard = unresolved.find((entry) => unsafeForVolunteer(entry.observation));
    if (hazard) {
      deferred.push({ siteId: site.id, reason: unsafeForVolunteer(hazard.observation)! });
      continue;
    }
    if (site.sensitive) {
      deferred.push({
        siteId: site.id,
        reason:
          'Sensitive or restricted site: excluded from volunteer plans. The coordinator must arrange qualified assessment and confirm permissions.',
      });
      continue;
    }
    if (sitesWithOpenTasks.has(site.id)) {
      deferred.push({
        siteId: site.id,
        reason:
          'An open task already covers this site; finish or review it before dispatching again.',
      });
      continue;
    }
    const ranked = unresolved
      .map((entry) => ({
        observation: entry.observation,
        assessment: assessIndexed(entry, site, peers, nowMs),
      }))
      .filter(({ assessment }) => assessment.score > 0)
      .sort(
        (a, b) =>
          b.assessment.score - a.assessment.score ||
          b.observation.observedAt.localeCompare(a.observation.observedAt) ||
          a.observation.id.localeCompare(b.observation.id),
      );
    if (!ranked.length) {
      deferred.push({
        siteId: site.id,
        reason:
          'No unresolved visible concern. Retain baseline observations for routine monitoring.',
      });
      continue;
    }
    const best = ranked[0];
    const minutes = Math.max(10, Math.ceil(site.walkMinutes)) + 10;
    candidates.push({
      siteId: site.id,
      observationId: best.observation.id,
      title: `Verify ${site.name} from the public path`,
      minutes,
      score: best.assessment.score,
      rationale: `${best.assessment.priority} follow-up priority; ${best.assessment.evidence} evidence. ${minutes - 10} min access allowance + 10 min observation. One visit per site.`,
    });
  }
  type Cell = { value: number; used: number; picks: number[] };
  const cells: Cell[] = Array.from({ length: budgetMinutes + 1 }, () => ({
    value: 0,
    used: 0,
    picks: [],
  }));
  candidates.forEach((candidate, index) => {
    for (let capacity = budgetMinutes; capacity >= candidate.minutes; capacity--) {
      const previous = cells[capacity - candidate.minutes];
      const next = {
        value: previous.value + candidate.score,
        used: previous.used + candidate.minutes,
        picks: [...previous.picks, index],
      };
      if (
        next.value > cells[capacity].value ||
        (next.value === cells[capacity].value && next.used < cells[capacity].used)
      )
        cells[capacity] = next;
    }
  });
  const selection = cells[budgetMinutes];
  const selected = new Set(selection.picks);
  candidates.forEach((candidate, index) => {
    if (!selected.has(index))
      deferred.push({
        siteId: candidate.siteId,
        reason:
          candidate.minutes > budgetMinutes
            ? `This visit needs ${candidate.minutes} minutes, above the ${budgetMinutes}-minute budget.`
            : 'Another combination covers more total follow-up priority within the available minutes. Reconsider when capacity changes.',
      });
  });
  const items = selection.picks
    .map((index) => candidates[index])
    .sort((a, b) => b.score - a.score || a.siteId.localeCompare(b.siteId))
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    budgetMinutes,
    usedMinutes: selection.used,
    items,
    deferred,
    explanation:
      'Exact budget allocation maximizes the sum of transparent follow-up priority across distinct eligible sites. Scores are operational priorities, not ecological health or hazard probabilities. Visit times include a site access allowance and 10 minutes of observation; this is not a travel route. Hazardous sites and sites with open tasks are excluded. A coordinator must approve safe access.',
    engineVersion: ENGINE_VERSION,
  };
}
