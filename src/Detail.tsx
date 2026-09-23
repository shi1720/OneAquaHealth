import { useState, useEffect } from 'react';
import {
  MapPin,
  ArrowRight,
  Check,
  ShieldCheck,
  Leaf,
  Bird,
  Users,
  Info,
  ClipboardList,
  MessageSquare,
  History,
  ExternalLink,
} from 'lucide-react';
import type { WorkspaceData, FieldTask, User } from '../shared/types';
import { Modal, PriorityBadge, StatusBadge, Spinner } from './components';
import { api, client, concernLabels, dateLabel, statusLabels } from './api';
export default function Detail({
  id,
  data,
  onClose,
  onChanged,
}: {
  id: string;
  data: WorkspaceData;
  onClose: () => void;
  onChanged: (m: string) => Promise<void>;
}) {
  const o = data.observations.find((o) => o.id === id)!;
  const a = data.assessments.find((a) => a.observationId === id)!;
  const site = data.sites.find((s) => s.id === o.siteId)!;
  const tasks = data.tasks.filter((t) => t.observationId === id);
  const [tab, setTab] = useState('evidence');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [taskKind, setTaskKind] = useState<FieldTask['kind']>('verify');
  const [owner, setOwner] = useState(data.user.id);
  const [due, setDue] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [result, setResult] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<User[]>([data.user]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  useEffect(() => {
    if (data.user.role !== 'coordinator') return;
    let alive = true;
    api<{ members: User[] }>('/members')
      .then((v) => {
        if (alive) setMembers(v.members);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [data.user.id, data.user.role]);
  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const actionedAt =
    o.actionedAt ??
    data.activity.find((v) => v.entityId === o.id && v.action === 'Report actioned')?.createdAt;
  const canResolve =
    Boolean(actionedAt) &&
    tasks.some(
      (t) =>
        t.kind === 'recheck' &&
        t.status === 'completed' &&
        t.completedAt &&
        t.completedAt >= actionedAt! &&
        (t.result?.trim().length ?? 0) >= 12,
    );
  return (
    <Modal
      title={o.concerns.map((c) => concernLabels[c]).join(' · ')}
      subtitle={`${site.name} · ${dateLabel(o.observedAt, true)}`}
      onClose={onClose}
      closeDisabled={busy}
      wide
    >
      <div className="detail-meta">
        <div>
          <PriorityBadge priority={a.priority} />
          <StatusBadge status={o.status} />
        </div>
        <span>
          {o.demo ? 'Demonstration data' : 'Community observation'} · {o.authorName}
        </span>
      </div>
      <div className="detail-tabs">
        {[
          ['evidence', 'The evidence'],
          ['response', 'Response & recheck'],
          ['trail', 'Decision trail'],
        ].map(([v, l]) => (
          <button
            key={v}
            aria-pressed={tab === v}
            className={tab === v ? 'active' : ''}
            onClick={() => setTab(v)}
          >
            {l}
            {v === 'response' && <span>{tasks.length}</span>}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === 'evidence' && (
          <>
            <div className="field-note">
              <span className="eyebrow">WHAT WAS OBSERVED</span>
              <p>{o.notes || 'No additional field note.'}</p>
              <div className="field-note-meta">
                <span>
                  Clarity: <b>{o.clarity}</b>
                </span>
                <span>
                  Flow: <b>{o.flow}</b>
                </span>
                <span>
                  Observer: <b>{o.confidence.replace('_', ' ')}</b>
                </span>
              </div>
              {o.photo && (
                <img className="evidence-photo" src={o.photo} alt={`Observation at ${site.name}`} />
              )}
            </div>
            <div className="assessment-header">
              <div>
                <span className="eyebrow">WHY THIS NEEDS A LOOK</span>
                <h3>
                  Verification priority{' '}
                  <span>
                    {a.score}
                    <small>/100</small>
                  </span>
                </h3>
              </div>
              <span className={`evidence-label ${a.evidence}`}>
                <i />
                {a.evidence} evidence
              </span>
            </div>
            <p className="form-hint">
              A transparent rule score for allocating attention. It is not a contamination
              probability or ecological health score.
            </p>
            <div className="reason-list">
              {a.reasons.map((r, i) => (
                <div className="reason" key={i}>
                  <div>
                    <b>{r.label}</b>
                    <p>{r.detail}</p>
                  </div>
                  <span>
                    {r.points > 0 ? '+' : ''}
                    {r.points}
                  </span>
                </div>
              ))}
            </div>
            <div className="evidence-question">
              <Info size={20} />
              <div>
                <b>The question to answer</b>
                <p>{a.question}</p>
                <small>{a.suggestedAction}</small>
              </div>
            </div>
            {a.cautions.map((v, i) => (
              <div className="caution" key={i}>
                <ShieldCheck size={16} />
                <p>{v}</p>
              </div>
            ))}
            <h3 className="detail-section-heading">One stream, connected lives</h3>
            <div className="one-health-cards">
              {[
                [Leaf, 'Environment', a.oneHealth.environment],
                [Bird, 'Animals', a.oneHealth.animals],
                [Users, 'People', a.oneHealth.people],
              ].map(([Icon, label, text]) => {
                const I = Icon as typeof Leaf;
                return (
                  <div key={String(label)}>
                    <I size={19} />
                    <b>{String(label)}</b>
                    <p>{String(text)}</p>
                  </div>
                );
              })}
            </div>
            <div className="engine-label">
              Decision rules {a.version} · Human review required · {a.corroboratingCount} other
              account{a.corroboratingCount === 1 ? '' : 's'} with matching reports
            </div>
          </>
        )}
        {tab === 'response' && (
          <>
            <div className="lifecycle">
              {['new', 'reviewed', 'actioned', 'resolved'].map((s, i) => (
                <div
                  key={s}
                  className={
                    ['new', 'reviewed', 'actioned', 'resolved'].indexOf(o.status) >= i
                      ? 'active'
                      : ''
                  }
                >
                  <span>{i + 1}</span>
                  <b>{statusLabels[s]}</b>
                </div>
              ))}
            </div>
            {data.user.role === 'coordinator' && (
              <section className="response-block">
                <h3>
                  {o.status === 'new'
                    ? 'Start with a human review.'
                    : o.status === 'reviewed'
                      ? 'Put a response in motion.'
                      : o.status === 'actioned'
                        ? 'Close the loop with a recheck.'
                        : 'A documented loop, closed.'}
                </h3>
                <p className="muted">
                  {o.status === 'new'
                    ? 'Read the evidence, record your judgment, and keep the reason attached.'
                    : o.status === 'reviewed'
                      ? 'Assign the appropriate work below, then mark this observation as action underway.'
                      : o.status === 'actioned'
                        ? 'Record what happened on a follow-up visit or qualified authority advice before resolving the observation.'
                        : 'A completed recheck supports this resolution. It does not certify water safety.'}
                </p>
                {o.status !== 'resolved' && (
                  <>
                    <label>
                      Coordinator’s decision note
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What have you decided, and why?"
                        rows={3}
                        maxLength={1500}
                      />
                    </label>
                    <button
                      className="button primary"
                      disabled={
                        busy || note.trim().length < 10 || (o.status === 'actioned' && !canResolve)
                      }
                      onClick={() =>
                        action(
                          () =>
                            client.review(
                              o.id,
                              o.status === 'new'
                                ? 'reviewed'
                                : o.status === 'reviewed'
                                  ? 'actioned'
                                  : 'resolved',
                              note,
                              o.revision,
                            ),
                          o.status === 'actioned'
                            ? 'Loop closed with a documented recheck.'
                            : 'Decision recorded in the audit trail.',
                        )
                      }
                    >
                      <Check size={16} />
                      {o.status === 'new'
                        ? 'Mark as reviewed'
                        : o.status === 'reviewed'
                          ? 'Mark action underway'
                          : 'Resolve after recheck'}
                    </button>
                    {o.status === 'actioned' && !canResolve && (
                      <p className="form-hint">
                        Complete a recheck task after action began, with a recorded result, to
                        enable resolution.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}
            <section className="response-block">
              <h3>
                Fieldwork & follow-through <span className="count-label">{tasks.length}</span>
              </h3>
              {tasks.length === 0 && (
                <p className="muted">
                  No tasks yet. Give the next step a name, an owner, and a date.
                </p>
              )}
              {tasks.map((t) => (
                <div className="task-detail" key={t.id}>
                  <div className="task-detail-head">
                    <span className="task-type-icon">
                      <ClipboardList size={19} />
                    </span>
                    <div>
                      <b>{t.title}</b>
                      <small>
                        {t.assignedTo} · Due {dateLabel(t.dueAt)} · {t.estimatedMinutes} min
                      </small>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.result && <blockquote>{t.result}</blockquote>}
                  {t.status !== 'completed' && data.user.role === 'coordinator' && (
                    <div className="task-cancel">
                      {cancelId === t.id ? (
                        <>
                          <p>
                            Cancel this open task? Its audit history remains. You can create a
                            replacement with a different owner.
                          </p>
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              action(
                                () => api(`/tasks/${t.id}`, {}, 'DELETE'),
                                'Task cancelled. Its history remains in the decision trail.',
                              ).then(() => setCancelId(null))
                            }
                          >
                            Confirm cancellation
                          </button>
                          <button className="button ghost small" onClick={() => setCancelId(null)}>
                            Keep task
                          </button>
                        </>
                      ) : (
                        <button className="text-link" onClick={() => setCancelId(t.id)}>
                          Cancel or reassign task
                        </button>
                      )}
                    </div>
                  )}
                  {t.status !== 'completed' &&
                    (data.user.role === 'coordinator' || t.canUpdate === true) && (
                      <div className="task-actions">
                        {t.status === 'planned' ? (
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              action(
                                () => client.updateTask(t.id, { status: 'in_progress' }),
                                'Task started.',
                              )
                            }
                          >
                            Start task
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <>
                            <label>
                              What did you find?
                              <textarea
                                rows={2}
                                placeholder="Describe the follow-up, the result, and any remaining uncertainty."
                                value={result[t.id] || ''}
                                maxLength={2000}
                                onChange={(e) => setResult({ ...result, [t.id]: e.target.value })}
                              />
                            </label>
                            <button
                              className="button secondary small"
                              disabled={busy || (result[t.id] || '').trim().length < 12}
                              onClick={() =>
                                action(
                                  () =>
                                    client.updateTask(t.id, {
                                      status: 'completed',
                                      result: result[t.id],
                                    }),
                                  'Task completed and added to the decision trail.',
                                )
                              }
                            >
                              <Check size={14} />
                              Complete task
                            </button>
                          </>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </section>
            {data.user.role === 'coordinator' && o.status !== 'resolved' && (
              <section className="response-block">
                <h3>Assign a next step</h3>
                <div className="form-grid">
                  <label>
                    Type of work
                    <select
                      value={taskKind}
                      onChange={(e) => setTaskKind(e.target.value as FieldTask['kind'])}
                    >
                      <option value="verify">Verification visit</option>
                      <option value="sample">Expert sampling</option>
                      <option value="cleanup">Coordinated cleanup</option>
                      <option value="recheck">Recheck after action</option>
                    </select>
                  </label>
                  <label>
                    Assigned to
                    <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {m.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      required
                    />
                  </label>
                  <div className="task-access">
                    <MapPin size={16} />
                    <span>{site.access}</span>
                  </div>
                </div>
                {a.priority === 'urgent' && (
                  <div className="inline-note warning">
                    This needs professional incident handling. Do not dispatch volunteers.
                  </div>
                )}
                <button
                  className="button primary"
                  disabled={busy || owner.trim().length < 2 || !due}
                  onClick={() =>
                    action(
                      () =>
                        client.task({
                          observationId: o.id,
                          title: `${taskKind === 'recheck' ? 'Recheck' : taskKind === 'sample' ? 'Expert sampling at' : taskKind === 'cleanup' ? 'Coordinate cleanup at' : 'Verify observation at'} ${site.name}`,
                          kind: taskKind,
                          assignedTo: owner,
                          dueAt: new Date(`${due}T12:00:00`).toISOString(),
                          estimatedMinutes: site.walkMinutes + 20,
                        }),
                      'Next step assigned.',
                    )
                  }
                >
                  <ClipboardList size={16} />
                  Create task
                </button>
                <p className="form-hint">
                  Assignments are recorded here. Rill does not send external notifications.
                </p>
              </section>
            )}
          </>
        )}
        {tab === 'trail' && (
          <>
            <h3>The decisions behind this observation</h3>
            <p className="muted">
              Recent events from the workspace’s latest 100 updates. Export JSON from Impact &
              evidence for the complete retained history.
            </p>
            <div className="audit-timeline">
              {data.activity
                .filter(
                  (v) =>
                    v.entityId === o.id ||
                    v.observationId === o.id ||
                    tasks.some((t) => t.id === v.entityId),
                )
                .map((v) => (
                  <div className="audit-event" key={v.id}>
                    <span className="audit-dot" />
                    <div>
                      <b>{v.action.replaceAll('_', ' ')}</b>
                      <p>{v.detail}</p>
                      <small>
                        {v.actorName} · {dateLabel(v.createdAt, true)}
                      </small>
                      {v.decision && (
                        <details className="decision-snapshot">
                          <summary>
                            Decision at the time · {v.decision.score}/100 · {v.decision.evidence}{' '}
                            evidence
                          </summary>
                          <p>
                            Rules {v.decision.engineVersion}, assessed{' '}
                            {dateLabel(v.decision.assessedAt, true)}
                          </p>
                          {v.decision.reasons.map((r, i) => (
                            <p key={i}>
                              <b>
                                {r.label}: {r.points}
                              </b>{' '}
                              {r.detail}
                            </p>
                          ))}
                        </details>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <div className="inline-note">
              <History size={18} /> Every review and task update keeps its author and time. This is
              an application audit log, not a tamper-proof ledger.
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {busy && (
          <div className="saving">
            <Spinner /> Saving your decision…
          </div>
        )}
      </div>
      <div className="modal-footer">
        <span className="small-muted">
          {o.id.slice(0, 8)} · revision {o.revision}
        </span>
        {tab === 'evidence' ? (
          <button className="button primary" onClick={() => setTab('response')}>
            Review & respond
            <ArrowRight size={16} />
          </button>
        ) : (
          <button className="button secondary" disabled={busy} onClick={onClose}>
            Done
            <Check size={16} />
          </button>
        )}
      </div>
    </Modal>
  );
}
