import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Eye,
  Clock3,
  CircleCheck,
  Sprout,
  Leaf,
  Droplets,
  Bird,
  ChevronRight,
  SlidersHorizontal,
  ListFilter,
  ScanLine,
} from 'lucide-react';
import type { WorkspaceData, Observation } from '../shared/types';
import { PriorityBadge, StatusBadge, SectionTitle, TextLink, Empty } from './components';
import { concernLabels, relativeTime } from './api';
import CatchmentMap from './Map';
export function ObservationRows({
  data,
  observations,
  onOpen,
}: {
  data: WorkspaceData;
  observations: Observation[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="observation-table">
      <div className="table-head">
        <span>OBSERVATION / LOCATION</span>
        <span>VERIFICATION PRIORITY</span>
        <span>STATUS</span>
        <span>REPORTED</span>
        <span />
      </div>
      {observations.map((o) => {
        const s = data.sites.find((s) => s.id === o.siteId);
        const a = data.assessments.find((a) => a.observationId === o.id);
        return (
          <button className="observation-row" key={o.id} onClick={() => onOpen(o.id)}>
            <div className="observation-name">
              <span
                className={`observation-icon ${o.concerns.includes('wildlife') || o.concerns.includes('clear') ? 'green' : 'amber'}`}
              >
                {o.concerns.includes('wildlife') ? (
                  <Bird size={18} />
                ) : o.concerns.includes('litter') ? (
                  <Leaf size={18} />
                ) : (
                  <Droplets size={18} />
                )}
              </span>
              <span>
                <b>{o.concerns.map((c) => concernLabels[c]).join(' · ')}</b>
                <small>
                  <MapPin size={11} />
                  {s?.name || 'Monitoring site'}
                </small>
              </span>
            </div>
            <div>{a && <PriorityBadge priority={a.priority} />}</div>
            <div>
              <StatusBadge status={o.status} />
            </div>
            <div className="reported">
              <span>{o.authorName}</span>
              <small>{relativeTime(o.createdAt)}</small>
            </div>
            <ChevronRight size={16} />
          </button>
        );
      })}
    </div>
  );
}
export default function Overview({
  data,
  onOpen,
  onPage,
  onObserve,
}: {
  data: WorkspaceData;
  onOpen: (id: string) => void;
  onPage: (page: string) => void;
  onObserve: (siteId?: string) => void;
}) {
  const [site, setSite] = useState<string>();
  const open = data.observations.filter((o) => o.status !== 'resolved');
  const needsReview = data.observations.filter((o) => o.status === 'new');
  const done = data.observations.filter((o) => o.status === 'resolved');
  const outstanding = data.tasks.filter((t) => t.status !== 'completed');
  const top = data.assessments
    .filter((a) => open.some((o) => o.id === a.observationId) && a.priority !== 'urgent')
    .sort((a, b) => b.score - a.score)[0];
  const topObs = data.observations.find((o) => o.id === top?.observationId);
  const topSite = data.sites.find((s) => s.id === topObs?.siteId);
  const selected = data.sites.find((s) => s.id === site);
  const stats = [
    {
      label: 'Monitoring sites',
      value: data.sites.length,
      note: 'One connected catchment',
      icon: MapPin,
      color: 'green',
    },
    {
      label: 'Awaiting review',
      value: needsReview.length,
      note: 'Observations need your eyes',
      icon: Eye,
      color: 'amber',
    },
    {
      label: 'Open field tasks',
      value: outstanding.length,
      note: 'A next step with an owner',
      icon: Clock3,
      color: 'blue',
    },
    {
      label: 'Loops closed',
      value: done.length,
      note: 'Action followed by a recheck',
      icon: CircleCheck,
      color: 'green',
    },
  ];
  return (
    <>
      <div className="metric-grid">
        {stats.map((s, i) => (
          <button
            key={s.label}
            className="metric"
            onClick={() =>
              onPage(
                i === 0 ? 'settings' : i === 2 ? 'planner' : i === 3 ? 'evidence' : 'observations',
              )
            }
          >
            <div className="metric-top">
              <span>{s.label}</span>
              <s.icon size={17} className={s.color} />
            </div>
            <strong>{String(s.value).padStart(2, '0')}</strong>
            <span className="metric-note">{s.note}</span>
          </button>
        ))}
      </div>
      <div className="overview-main">
        <section className="panel map-panel">
          <SectionTitle eyebrow="THE BIG PICTURE" title="A living catchment">
            <span className="small-muted">All monitoring sites</span>
          </SectionTitle>
          <CatchmentMap data={data} selected={site} onSelect={setSite} />
          {selected ? (
            <div className="map-selection">
              <div>
                <b>{selected.name}</b>
                <span>{selected.access}</span>
              </div>
              <button
                className="text-link"
                onClick={() => {
                  const o = data.observations.find((o) => o.siteId === selected.id);
                  o ? onOpen(o.id) : onObserve(selected.id);
                }}
              >
                {data.observations.some((o) => o.siteId === selected.id)
                  ? 'View site activity'
                  : 'Observe this site'}
                <ArrowUpRight size={15} />
              </button>
            </div>
          ) : (
            <div className="map-legend">
              <span>
                <i className="legend-dot amber" /> Follow-up needed
              </span>
              <span>
                <i className="legend-dot green" /> Routine observations
              </span>
              <span>
                Select a site to explore <ArrowUpRight size={12} />
              </span>
            </div>
          )}
        </section>
        <section className="next-card">
          <div className="next-header">
            <span className="eyebrow">MAKE THE NEXT VISIT COUNT</span>
            <span className="next-icon">
              <ScanLine size={19} />
            </span>
          </div>
          <h2>
            A small check.
            <br />A clearer picture.
          </h2>
          <p className="next-description">
            Your community is looking.
            <br />
            Here’s where another look matters.
          </p>
          {top && topSite ? (
            <>
              <div className="next-site">
                <span className="mini-label">SUGGESTED FOR REVIEW</span>
                <h3>{topSite.name}</h3>
                <p>{top.question}</p>
                <div className="next-badges">
                  <PriorityBadge priority={top.priority} />
                  <span className="small-muted">{top.evidence} evidence</span>
                </div>
              </div>
              <button className="button dark full" onClick={() => onOpen(top.observationId)}>
                See the evidence
                <ArrowUpRight size={17} />
              </button>
              <button className="next-plan" onClick={() => onPage('planner')}>
                Have two hours? Build a field plan
                <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <div className="next-site">
                <h3>Start with one observation.</h3>
                <p>Small, consistent visits help your team see what changes.</p>
              </div>
              <button className="button dark full" onClick={() => onObserve()}>
                Add an observation
                <ArrowRight size={16} />
              </button>
            </>
          )}
          <div className="next-footer">
            <span className="small-leaf">
              <Sprout size={15} />
            </span>
            Evidence guides us. People decide.
          </div>
        </section>
      </div>
      <section className="panel observations-panel">
        <SectionTitle title="The latest from your stream">
          <TextLink onClick={() => onPage('observations')}>All observations</TextLink>
        </SectionTitle>
        {data.observations.length ? (
          <ObservationRows
            data={data}
            observations={[...data.observations]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 4)}
            onOpen={onOpen}
          />
        ) : (
          <Empty
            title="Your first observation starts the story."
            action={
              <button className="button secondary" onClick={() => onObserve()}>
                Add an observation
                <ArrowRight size={15} />
              </button>
            }
          >
            Collect careful details from a safe public path. Your team can take it from there.
          </Empty>
        )}
      </section>
      <div className="one-health-strip">
        <div>
          <span className="one-health-mark">
            <Leaf size={18} />
          </span>
          <b>One stream. Shared health.</b>
        </div>
        <p>Healthy habitats support wildlife and the communities around them.</p>
        <button onClick={() => onPage('evidence')}>
          See the connections
          <ArrowUpRight size={14} />
        </button>
      </div>
    </>
  );
}
export function Observations({
  data,
  onOpen,
  onObserve,
}: {
  data: WorkspaceData;
  onOpen: (id: string) => void;
  onObserve: (siteId?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [site, setSite] = useState('all');
  const [sort, setSort] = useState('priority');
  const filtered = data.observations
    .filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (site === 'all' || o.siteId === site) &&
        [
          o.notes,
          o.authorName,
          data.sites.find((s) => s.id === o.siteId)?.name,
          ...o.concerns.map((c) => concernLabels[c]),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? (data.assessments.find((v) => v.observationId === b.id)?.score || 0) -
          (data.assessments.find((v) => v.observationId === a.id)?.score || 0)
        : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <section className="panel">
      <div className="filter-bar">
        <div className="search-input">
          <ListFilter size={17} />
          <input
            aria-label="Search observations"
            placeholder="Search observations, places, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Filter by site" value={site} onChange={(e) => setSite(e.target.value)}>
          <option value="all">All sites</option>
          {data.sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort observations"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="priority">Priority first</option>
          <option value="recent">Newest first</option>
        </select>
      </div>
      <div className="tab-row">
        {[
          ['all', 'All observations'],
          ['new', 'Needs review'],
          ['reviewed', 'Reviewed'],
          ['actioned', 'In action'],
          ['resolved', 'Rechecked'],
        ].map(([v, l]) => (
          <button
            aria-pressed={status === v}
            className={status === v ? 'active' : ''}
            key={v}
            onClick={() => setStatus(v)}
          >
            {l}
            <span>{data.observations.filter((o) => v === 'all' || o.status === v).length}</span>
          </button>
        ))}
      </div>
      {filtered.length ? (
        <ObservationRows data={data} observations={filtered} onOpen={onOpen} />
      ) : (
        <Empty
          title={data.observations.length ? 'No matching observations.' : 'A good place to begin.'}
          action={
            data.observations.length ? (
              <button
                className="button secondary"
                onClick={() => {
                  setQuery('');
                  setSite('all');
                  setStatus('all');
                }}
              >
                Clear filters
              </button>
            ) : (
              <button className="button primary" onClick={() => onObserve()}>
                Add your first observation
              </button>
            )
          }
        >
          {data.observations.length
            ? 'Try another search or clear your filters.'
            : 'Your team’s reports will appear here, ready for review.'}
        </Empty>
      )}
      <div className="table-footer">
        <span>
          {filtered.length} observation{filtered.length !== 1 ? 's' : ''}
        </span>
        <span>Priority is a suggestion for follow-up, not a water safety score.</span>
      </div>
    </section>
  );
}
