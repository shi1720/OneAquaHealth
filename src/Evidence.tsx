import { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Map,
  Layers,
  Leaf,
  Bird,
  Users,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Info,
  History,
} from 'lucide-react';
import type { WorkspaceData } from '../shared/types';
import { dateLabel } from './api';
import { SectionTitle, Empty, Spinner } from './components';
export default function Evidence({
  data,
  onOpen,
}: {
  data: WorkspaceData;
  onOpen: (id: string) => void;
}) {
  const [tab, setTab] = useState('impact');
  const [format, setFormat] = useState('json');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exported, setExported] = useState(false);
  async function download() {
    setExporting(true);
    setExportError('');
    setExported(false);
    try {
      const response = await fetch(`/api/export?format=${format}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'The export could not be prepared. Please retry.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `rill-${data.user.isDemo ? 'synthetic-demo' : 'workspace'}-${new Date().toISOString().slice(0, 10)}.${format === 'fhir' ? 'fhir.json' : format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true);
    } catch (error) {
      setExportError(
        error instanceof TypeError
          ? 'The download could not start. Check your connection and retry.'
          : (error as Error).message,
      );
    } finally {
      setExporting(false);
    }
  }
  const resolved = data.observations.filter((o) => o.status === 'resolved');
  const reviewed = data.observations.filter((o) => o.status !== 'new');
  const completed = data.tasks.filter((t) => t.status === 'completed');
  const rechecks = completed.filter((task) => {
    const observation = data.observations.find((item) => item.id === task.observationId);
    const actionedAt =
      observation?.actionedAt ??
      data.activity.find(
        (event) => event.entityId === task.observationId && event.action === 'Report actioned',
      )?.createdAt;
    return (
      task.kind === 'recheck' && actionedAt && task.completedAt && task.completedAt >= actionedAt
    );
  });
  return (
    <>
      <div className="page-tabs">
        <button
          aria-pressed={tab === 'impact'}
          onClick={() => setTab('impact')}
          className={tab === 'impact' ? 'active' : ''}
        >
          <Leaf size={16} /> The full picture
        </button>
        <button
          aria-pressed={tab === 'exports'}
          onClick={() => setTab('exports')}
          className={tab === 'exports' ? 'active' : ''}
        >
          <Download size={16} /> Data & interoperability
        </button>
        <button
          aria-pressed={tab === 'history'}
          onClick={() => setTab('history')}
          className={tab === 'history' ? 'active' : ''}
        >
          <History size={16} /> Decision trail
        </button>
      </div>
      {tab === 'impact' && (
        <>
          <div className="impact-hero">
            <div>
              <span className="eyebrow">ONE HEALTH IN PRACTICE</span>
              <h2>
                Follow the observation.
                <br />
                See the connection.
              </h2>
              <p>
                A change in a small stream can matter to a much bigger community. Rill keeps the
                environmental, animal, and human context together.
              </p>
            </div>
            <div
              className="impact-orbit"
              aria-label="Environment, animals and people are connected"
            >
              <span className="orbit-core">
                One
                <br />
                <b>Health</b>
              </span>
              <span className="orbit-leaf">
                <Leaf size={24} />
              </span>
              <span className="orbit-bird">
                <Bird size={24} />
              </span>
              <span className="orbit-people">
                <Users size={24} />
              </span>
            </div>
          </div>
          <div className="impact-grid">
            {[
              [
                Leaf,
                'A living environment',
                'Repeated observations help identify changes in habitat, water appearance, and the stream’s banks.',
                'Environment',
              ],
              [
                Bird,
                'Space for wildlife',
                'Visible wildlife and signs of distress help guide careful review and appropriate expert referrals.',
                'Animals',
              ],
              [
                Users,
                'A connected community',
                'Public access and local use help coordinators decide where verification and communication matter.',
                'People',
              ],
            ].map(([Icon, title, desc, label]) => {
              const I = Icon as typeof Leaf;
              return (
                <section className="panel impact-card" key={String(label)}>
                  <I size={22} />
                  <span className="eyebrow">{String(label)}</span>
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                </section>
              );
            })}
          </div>
          <section className="panel">
            <SectionTitle eyebrow="MEASURE FOLLOW-THROUGH" title="Progress you can account for">
              <span className="small-muted">
                {data.user.isDemo ? 'Sample workspace metrics' : 'Your workspace metrics'}
              </span>
            </SectionTitle>
            <div className="progress-metrics">
              <div>
                <strong>
                  {reviewed.length}
                  <span>/{data.observations.length}</span>
                </strong>
                <b>Observations reviewed</b>
                <p>At least one human decision</p>
              </div>
              <div>
                <strong>{completed.length}</strong>
                <b>Field tasks completed</b>
                <p>A recorded result, with an owner</p>
              </div>
              <div>
                <strong>{rechecks.length}</strong>
                <b>Follow-up rechecks</b>
                <p>Follow-up evidence after action</p>
              </div>
              <div>
                <strong>{resolved.length}</strong>
                <b>Loops closed</b>
                <p>Review, action, and recheck</p>
              </div>
            </div>
            <p className="evidence-disclaimer">
              <Info size={15} /> These are workflow measures. They do not demonstrate improved water
              quality or reduced health risk.
            </p>
          </section>
          {resolved.length > 0 && (
            <section className="panel resolved-panel">
              <SectionTitle title="The story after the report" />
              {resolved.map((o) => (
                <button className="resolved-row" key={o.id} onClick={() => onOpen(o.id)}>
                  <span className="resolved-check">
                    <Check size={20} />
                  </span>
                  <div>
                    <b>{data.sites.find((s) => s.id === o.siteId)?.name}</b>
                    <p>
                      {rechecks.find((t) => t.observationId === o.id)?.result ||
                        'Completed recheck recorded.'}
                    </p>
                  </div>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </section>
          )}
        </>
      )}
      {tab === 'exports' && (
        <div className="exports-layout">
          <section className="panel export-card">
            <span className="eyebrow">KEEP THE EVIDENCE MOVING</span>
            <h2>
              Your work belongs
              <br />
              with your team.
            </h2>
            <p>
              Download observations, follow-up tasks, and their provenance. Bring the record into
              your research, reporting, or next conversation.
            </p>
            <div className="export-formats">
              {[
                [FileJson, 'json', 'JSON', 'Complete workspace evidence'],
                [FileSpreadsheet, 'csv', 'CSV', 'Observations for a spreadsheet'],
                [Map, 'geojson', 'GeoJSON', 'Monitoring sites and observations'],
                [Layers, 'fhir', 'FHIR R4', 'Experimental environmental mapping'],
              ].map(([Icon, v, title, desc]) => {
                const I = Icon as typeof FileJson;
                return (
                  <button
                    key={String(v)}
                    aria-pressed={format === v}
                    disabled={exporting}
                    onClick={() => {
                      setFormat(String(v));
                      setExportError('');
                      setExported(false);
                    }}
                    className={format === v ? 'selected' : ''}
                  >
                    <I size={21} />
                    <div>
                      <b>{String(title)}</b>
                      <small>{String(desc)}</small>
                    </div>
                    <span className="radio-dot">{format === v && <i />}</span>
                  </button>
                );
              })}
            </div>
            <button
              disabled={data.user.role !== 'coordinator' || exporting}
              onClick={download}
              className="button primary full"
            >
              {exporting ? <Spinner /> : <Download size={17} />}
              {exporting
                ? 'Preparing download…'
                : `Download ${format === 'fhir' ? 'FHIR bundle' : format.toUpperCase()}`}
            </button>
            {exportError && (
              <p role="alert" className="form-error">
                {exportError}
              </p>
            )}
            {exported && (
              <p role="status" className="form-hint">
                Download started. Check your browser’s downloads.
              </p>
            )}
            <p className="form-hint">
              {data.user.role === 'coordinator'
                ? 'Exports exclude passwords and image data. Share only with authorised recipients.'
                : 'A workspace coordinator can export team data.'}
            </p>
          </section>
          <div>
            <section className="panel interoperability">
              <span className="eyebrow">INTEROPERABILITY WITH HONEST BOUNDARIES</span>
              <h3>
                Environmental observations.
                <br />A shared language.
              </h3>
              <p>
                Our experimental FHIR R4 mapping represents sites as Locations and field reports as
                Observations, with Tasks and Provenance connecting the follow-up.
              </p>
              <div className="resource-list">
                <span>
                  Location <b>Where</b>
                </span>
                <span>
                  Observation <b>What was noticed</b>
                </span>
                <span>
                  Task <b>The next step</b>
                </span>
                <span>
                  Provenance <b>Who and when</b>
                </span>
              </div>
              <div className="inline-note">
                <Info size={18} />
                <span>
                  This is a base R4 mapping, not certified interoperability or conformance to the
                  draft OneAquaHealth implementation guide.
                </span>
              </div>
              <a
                href="https://build.fhir.org/ig/hl7-eu/oah/"
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Explore the OneAquaHealth FHIR work
                <ArrowUpRight size={15} />
              </a>
            </section>
            <section className="export-trust">
              <ShieldCheck size={22} />
              <div>
                <b>Evidence travels with its limitations.</b>
                <p>
                  Source labels and demonstration flags stay attached. Visual observations never
                  become laboratory results.
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
      {tab === 'history' && (
        <section className="panel">
          <SectionTitle title="An accountable record">
            <span className="small-muted">Latest workspace events</span>
          </SectionTitle>
          <div className="workspace-timeline">
            {data.activity.map((v) => (
              <div className="audit-event" key={v.id}>
                <span className="audit-dot" />
                <div>
                  <b>{v.action.replaceAll('_', ' ')}</b>
                  <p>{v.detail}</p>
                  <small>
                    {v.actorName} · {dateLabel(v.createdAt, true)}
                  </small>
                </div>
              </div>
            ))}
          </div>
          {!data.activity.length && (
            <Empty title="Your decisions will leave a trail.">
              Create a report, review it, or assign a task to start your workspace history.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
