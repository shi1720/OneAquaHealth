import { useState, useEffect } from 'react';
import {
  Clock3,
  ArrowRight,
  Check,
  MapPin,
  Route,
  Info,
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import type { WorkspaceData, FieldPlan } from '../shared/types';
import { client, dateLabel } from './api';
import { Spinner, SectionTitle, Empty, StatusBadge } from './components';
export default function Planner({
  data,
  onOpen,
  onChanged,
}: {
  data: WorkspaceData;
  onOpen: (id: string) => void;
  onChanged: (m: string) => Promise<void>;
}) {
  const [budget, setBudget] = useState(120);
  const [plan, setPlan] = useState<FieldPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [commit, setCommit] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<'plan' | 'tasks'>('plan');
  const [filter, setFilter] = useState('open');
  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError('');
    const timer = setTimeout(
      () =>
        client
          .plan(budget)
          .then((p) => {
            if (alive) setPlan(p);
          })
          .catch((e) => {
            if (alive) setError(e.message);
          })
          .finally(() => {
            if (alive) setBusy(false);
          }),
      180,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [budget, data.tasks.length, data.observations]);
  async function save() {
    setCommit(true);
    setError('');
    try {
      const result = await client.commitPlan(budget);
      await onChanged(
        `${result.tasks.length} field task${result.tasks.length === 1 ? '' : 's'} created. Your plan is ready.`,
      );
      setActive('tasks');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommit(false);
    }
  }
  return (
    <>
      <div className="page-tabs">
        <button className={active === 'plan' ? 'active' : ''} onClick={() => setActive('plan')}>
          <Route size={16} /> Build a field plan
        </button>
        <button className={active === 'tasks' ? 'active' : ''} onClick={() => setActive('tasks')}>
          <ClipboardList size={16} /> Team tasks{' '}
          <span>{data.tasks.filter((t) => t.status !== 'completed').length}</span>
        </button>
      </div>
      {active === 'plan' ? (
        <div className="planner-layout">
          <aside className="panel planner-controls">
            <span className="eyebrow">YOUR NEXT TWO HOURS</span>
            <h2>
              Time is limited.
              <br />
              Make it count.
            </h2>
            <p>
              Choose how much field time your team has. Rill finds a useful set of verification
              visits that fits.
            </p>
            <label className="budget-label" htmlFor="budget">
              Available field time{' '}
              <strong>
                {budget}
                <span> minutes</span>
              </strong>
            </label>
            <input
              id="budget"
              type="range"
              min="20"
              max="240"
              step="10"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <div className="range-ticks">
              <span>20 min</span>
              <span>2 hours</span>
              <span>4 hours</span>
            </div>
            <div className="budget-presets">
              {[60, 120, 180].map((v) => (
                <button
                  key={v}
                  onClick={() => setBudget(v)}
                  className={budget === v ? 'active' : ''}
                >
                  {v / 60} hour{v > 60 ? 's' : ''}
                </button>
              ))}
            </div>
            <div className="planner-rule">
              <ShieldCheck size={19} />
              <div>
                <b>Safety comes first</b>
                <p>Serious incidents and restricted sites are excluded from volunteer visits.</p>
              </div>
            </div>
            <div className="planner-rule">
              <MapPin size={18} />
              <div>
                <b>A planning estimate</b>
                <p>
                  Visit costs include each site’s estimated access time and observation time. This
                  is not turn-by-turn routing.
                </p>
              </div>
            </div>
            <a
              href="https://github.com/shi1720/OneAquaHealth/blob/main/docs/methodology.md"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Read the decision rules
              <ArrowRight size={14} />
            </a>
          </aside>
          <div className="planner-result">
            <div className="panel plan-panel">
              <SectionTitle
                eyebrow="EXPLAINED. BUDGETED. READY TO REVIEW."
                title="Your suggested fieldwork"
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <span className="plan-count">{plan?.items.length || 0} visits</span>
                )}
              </SectionTitle>
              {plan && (
                <>
                  <div className="plan-time">
                    <div>
                      <Clock3 size={17} />
                      <b>{plan.usedMinutes} min</b>
                      <span>of {budget} available</span>
                    </div>
                    <div className="time-bar">
                      <span style={{ width: `${(plan.usedMinutes / budget) * 100}%` }} />
                    </div>
                    <small>{budget - plan.usedMinutes} min left as a buffer</small>
                  </div>
                  {plan.items.length ? (
                    <div className="plan-items">
                      {plan.items.map((item, i) => (
                        <div className="plan-item" key={item.siteId}>
                          <div className="plan-index">{i + 1}</div>
                          <div className="plan-item-content">
                            <div className="plan-item-heading">
                              <h3>{data.sites.find((s) => s.id === item.siteId)?.name}</h3>
                              <span>
                                <Clock3 size={13} />
                                {item.minutes} min
                              </span>
                            </div>
                            <b>{item.title}</b>
                            <p>{item.rationale}</p>
                            <div className="plan-item-footer">
                              <span>Priority {item.score}/100</span>
                              <button
                                className="text-link"
                                onClick={() => onOpen(item.observationId)}
                              >
                                Review evidence
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No visits fit this plan.">
                      Try a larger time budget, review existing tasks, or add observations. Serious
                      incidents need direct referral.
                    </Empty>
                  )}
                  <div className="plan-explanation">
                    <Info size={17} />
                    <p>{plan.explanation}</p>
                  </div>
                  <div className="plan-actions">
                    <span className="small-muted">Your team makes the final call.</span>
                    <button
                      className="button primary"
                      disabled={
                        busy || commit || !plan.items.length || data.user.role !== 'coordinator'
                      }
                      onClick={save}
                    >
                      {commit ? <Spinner /> : <Check size={16} />}Assign this plan
                    </button>
                  </div>
                </>
              )}
            </div>
            {!!plan?.deferred.length && (
              <div className="panel deferred-panel">
                <h3>
                  What isn’t in this plan <span>{plan.deferred.length}</span>
                </h3>
                {plan.deferred.map((item, i) => (
                  <div className="deferred-row" key={`${item.siteId}-${i}`}>
                    <MapPin size={15} />
                    <div>
                      <b>{data.sites.find((s) => s.id === item.siteId)?.name || 'Site'}</b>
                      <p>{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <section className="panel">
          <SectionTitle title="A next step with an owner">
            <select
              aria-label="Filter tasks"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="open">Open tasks</option>
              <option value="all">All tasks</option>
              <option value="completed">Completed</option>
            </select>
          </SectionTitle>
          {data.tasks
            .filter(
              (t) =>
                filter === 'all' ||
                (filter === 'open' ? t.status !== 'completed' : t.status === 'completed'),
            )
            .map((t) => (
              <button key={t.id} className="task-list-row" onClick={() => onOpen(t.observationId)}>
                <span className="task-type-icon">
                  <ClipboardList size={20} />
                </span>
                <div className="task-main">
                  <b>{t.title}</b>
                  <small>
                    {data.sites.find((s) => s.id === t.siteId)?.name} · {t.assignedTo} · Due{' '}
                    {dateLabel(t.dueAt)}
                  </small>
                </div>
                <span className="task-minutes">{t.estimatedMinutes} min</span>
                <StatusBadge status={t.status} />
                <ChevronRight size={17} />
              </button>
            ))}
          {data.tasks.filter(
            (t) =>
              filter === 'all' ||
              (filter === 'open' ? t.status !== 'completed' : t.status === 'completed'),
          ).length === 0 && (
            <Empty title="Nothing waiting here.">
              Build a plan or assign a next step from an observation.
            </Empty>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
