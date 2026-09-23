import type { WorkspaceData } from '../shared/types';
import { ENGINE_VERSION } from '../shared/engine';

const mappingDisclaimer =
  'Experimental environmental mapping using base FHIR R4 resources. Not validated against the draft OneAquaHealth implementation guide and no conformance is claimed. Visual citizen observations are not clinical diagnoses or water-safety determinations.';
export function exportJSON(data: WorkspaceData, now = new Date()) {
  return {
    schema: 'rill.workspace-export.v1',
    exportedAt: now.toISOString(),
    engineVersion: ENGINE_VERSION,
    workspace: {
      name: data.user.workspaceName,
      demo: data.user.isDemo,
      scenarioDate: data.scenarioDate,
    },
    dataLabel: data.user.isDemo
      ? 'SYNTHETIC DEMONSTRATION: not monitoring evidence'
      : 'USER-REPORTED: unverified unless recorded otherwise',
    disclaimer:
      'Operational follow-up priorities are heuristics, not ecological health scores or health-risk probabilities. Photos, email addresses, and authentication data are excluded.',
    sites: data.sites,
    observations: data.observations.map(({ photo, authorId, authorName, ...observation }) => ({
      ...observation,
      authorRef: authorId,
      hasPhoto: Boolean(photo),
    })),
    assessments: data.assessments,
    tasks: data.tasks,
    activity: data.activity,
  };
}
/** Quote every cell and neutralize formula triggers even behind leading whitespace/control characters. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function exportCSV(data: WorkspaceData): string {
  const columns = [
    'observation_id',
    'site_id',
    'site_name',
    'observed_at',
    'reported_at',
    'concerns',
    'clarity',
    'flow',
    'observer_confidence',
    'review_status',
    'revision',
    'follow_up_priority',
    'priority_points',
    'evidence_strength',
    'notes',
    'data_label',
    'engine_version',
  ];
  const rows = data.observations.map((observation) => {
    const assessment = data.assessments.find((item) => item.observationId === observation.id);
    return [
      observation.id,
      observation.siteId,
      data.sites.find((site) => site.id === observation.siteId)?.name,
      observation.observedAt,
      observation.createdAt,
      observation.concerns.join('; '),
      observation.clarity,
      observation.flow,
      observation.confidence,
      observation.status,
      observation.revision,
      assessment?.priority,
      assessment?.score,
      assessment?.evidence,
      observation.notes,
      observation.demo ? 'synthetic demonstration' : 'user reported',
      ENGINE_VERSION,
    ];
  });
  return '\uFEFF' + [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function exportGeoJSON(data: WorkspaceData, now = new Date()) {
  return {
    type: 'FeatureCollection',
    name: data.user.workspaceName,
    exportedAt: now.toISOString(),
    dataLabel: data.user.isDemo ? 'synthetic demonstration' : 'user reported',
    engineVersion: ENGINE_VERSION,
    features: data.sites.map((site) => ({
      type: 'Feature',
      id: site.id,
      geometry: { type: 'Point', coordinates: [site.lng, site.lat] },
      properties: {
        name: site.name,
        catchment: site.catchment,
        habitat: site.habitat,
        access: site.access,
        sensitive: site.sensitive,
        lastCheckedAt: site.lastCheckedAt,
        observations: data.observations
          .filter((observation) => observation.siteId === site.id)
          .map((observation) => ({
            id: observation.id,
            observedAt: observation.observedAt,
            concerns: observation.concerns,
            status: observation.status,
            priority: data.assessments.find((item) => item.observationId === observation.id)
              ?.priority,
          })),
      },
    })),
  };
}
export function exportFHIR(data: WorkspaceData, now = new Date()) {
  const base = `https://rill.example/fhir/${data.user.workspaceId}`;
  const full = (type: string, id: string) => `${base}/${type}/${encodeURIComponent(id)}`;
  const ref = (type: string, id: string) => ({ reference: full(type, id) });
  const tag = {
    system: 'https://rill.example/CodeSystem/data-label',
    code: data.user.isDemo ? 'synthetic-demo' : 'user-reported',
    display: data.user.isDemo
      ? 'Synthetic demonstration data'
      : 'User-reported environmental observation',
  };
  const entry: { fullUrl: string; resource: Record<string, unknown> }[] = [];
  const add = (type: string, id: string, resource: Record<string, unknown>) =>
    entry.push({
      fullUrl: full(type, id),
      resource: { resourceType: type, id, meta: { tag: [tag] }, ...resource },
    });
  add('Organization', 'workspace', { name: data.user.workspaceName, active: true });
  for (const site of data.sites)
    add('Location', site.id, {
      status: 'active',
      mode: 'instance',
      name: site.name,
      description: site.description,
      position: { longitude: site.lng, latitude: site.lat },
      managingOrganization: ref('Organization', 'workspace'),
    });
  for (const observation of data.observations) {
    add('Observation', observation.id, {
      identifier: [{ system: 'https://rill.example/observation', value: observation.id }],
      status: observation.status === 'new' ? 'preliminary' : 'final',
      code: { text: 'Citizen visual freshwater observation' },
      subject: ref('Location', observation.siteId),
      effectiveDateTime: observation.observedAt,
      issued: observation.createdAt,
      method: { text: 'Unaided citizen observation from public access; not a laboratory assay' },
      valueString: observation.concerns.join(', '),
      component: [
        { code: { text: 'Visual clarity' }, valueString: observation.clarity },
        { code: { text: 'Observed flow' }, valueString: observation.flow },
        {
          code: { text: 'Self-reported observer confidence' },
          valueString: observation.confidence,
        },
        { code: { text: 'Operational review state' }, valueString: observation.status },
      ],
      note: [{ text: observation.notes }, { text: mappingDisclaimer }],
    });
    add('Provenance', `prov-${observation.id}`, {
      target: [ref('Observation', observation.id)],
      recorded: observation.createdAt,
      activity: { text: 'Citizen submission recorded by Rill' },
      agent: [
        {
          type: { text: 'Author' },
          who: {
            identifier: {
              system: 'https://rill.example/observer-pseudonym',
              value: observation.authorId,
            },
          },
        },
      ],
    });
  }
  for (const task of data.tasks)
    add('Task', task.id, {
      status:
        task.status === 'planned'
          ? 'requested'
          : task.status === 'in_progress'
            ? 'in-progress'
            : 'completed',
      intent: 'order',
      code: { text: task.kind },
      description: task.title,
      focus: ref('Observation', task.observationId),
      authoredOn: task.createdAt,
      requester: ref('Organization', 'workspace'),
      restriction: { period: { end: task.dueAt } },
      ...(task.result
        ? { output: [{ type: { text: 'Recorded field result' }, valueString: task.result }] }
        : {}),
    });
  return {
    resourceType: 'Bundle',
    id: crypto.randomUUID(),
    type: 'collection',
    timestamp: now.toISOString(),
    meta: {
      tag: [
        tag,
        {
          system: 'https://rill.example/CodeSystem/mapping-status',
          code: 'experimental-base-r4',
          display: mappingDisclaimer,
        },
      ],
    },
    entry,
  };
}
