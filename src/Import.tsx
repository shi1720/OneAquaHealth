import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, FileText, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import type { WorkspaceData } from '../shared/types';
import { api, concernLabels } from './api';
import { Modal, Spinner } from './components';
import { parseImport, prepareImport, type ImportPreview } from './import-parser';

export default function Import({
  data,
  onClose,
  onChanged,
}: {
  data: WorkspaceData;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const fileRead = useRef(0);
  const [preview, setPreview] = useState<ImportPreview | null>(null),
    [filename, setFilename] = useState(''),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [result, setResult] = useState<{
      imported: number;
      skipped: number;
      duplicates: number;
    } | null>(null);
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const readId = ++fileRead.current;
    setError('');
    setPreview(null);
    setResult(null);
    setMapping({});
    setConfirmed(false);
    setFilename(file.name);
    if (file.size > 1_000_000) {
      setError('Choose a file smaller than 1 MB. Photos are not imported.');
      return;
    }
    try {
      const content = await file.text();
      if (readId === fileRead.current) setPreview(parseImport(content, file.name));
    } catch (e) {
      if (readId === fileRead.current) setError((e as Error).message);
    }
  }
  const sourceSites = [
    ...new Map(
      preview?.rows.map((row) => [row.sourceSite, { id: row.sourceSite, name: row.sourceName }]) ||
        [],
    ).values(),
  ];
  const syntheticBlocked = !!preview?.sourceDemo && !data.user.isDemo;
  const needsClassification =
    !!preview && !preview.provenanceKnown && !preview.sourceDemo && !data.user.isDemo;
  const ready =
    !!preview &&
    preview.rows.length > 0 &&
    !preview.errors.length &&
    !syntheticBlocked &&
    (!needsClassification || confirmed) &&
    sourceSites.every((site) => typeof mapping[site.id] === 'string' && mapping[site.id]);
  async function commit() {
    if (!preview || !ready) return;
    setBusy(true);
    setError('');
    try {
      const prepared = await prepareImport(preview, mapping);
      const response = await api<{ imported: number; skipped: number }>('/import', {
        observations: prepared.observations,
        sourceDemo: preview.sourceDemo,
      });
      setResult({ ...response, duplicates: prepared.duplicates });
      await onChanged(
        `${response.imported} observation${response.imported === 1 ? '' : 's'} imported; ${response.skipped + prepared.duplicates} duplicate${response.skipped + prepared.duplicates === 1 ? '' : 's'} skipped.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Bring existing evidence into Rill"
      subtitle="Preview the records and match each source site before importing."
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="form-body import-body">
        {result ? (
          <div className="import-success" role="status">
            <span>
              <Check size={26} />
            </span>
            <h3>
              {result.imported} observation{result.imported === 1 ? '' : 's'} imported
            </h3>
            <p>
              {result.skipped} previously imported record{result.skipped === 1 ? '' : 's'} and{' '}
              {result.duplicates} duplicate{result.duplicates === 1 ? '' : 's'} within this file
              were skipped.
            </p>
            <p>
              The accepted records are awaiting human review. Original authorship and old review
              decisions have not been asserted.
            </p>
          </div>
        ) : (
          <>
            <div className="inline-note">
              <ShieldCheck size={20} />
              <span>
                Import Rill CSV/JSON exports or compatible observations. This creates new reports
                under your coordinator account. It does not restore a workspace or verify
                environmental claims.
              </span>
            </div>
            <label className="import-file-label">
              <Upload size={22} />
              <span>
                <b>Choose an observation file</b>
                <small>CSV or JSON · up to 100 records · 1 MB maximum</small>
              </span>
              <input
                aria-label="Observation import file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={selectFile}
                disabled={busy}
              />
            </label>
            <details className="import-format">
              <summary>Supported fields and format</summary>
              <p>
                Use{' '}
                <code>
                  site_id, observed_at, concerns, clarity, flow, observer_confidence, notes,
                  data_label
                </code>{' '}
                for CSV. JSON accepts Rill workspace exports or observation arrays with camelCase
                fields. Concerns use codes such as <code>litter; foam</code>. Times require a
                timezone, for example <code>2026-09-23T10:00:00Z</code>. A source site ID or name is
                mapped explicitly below.
              </p>
              <p>
                Supported concern codes: foam, discoloration, litter, odour, dead_fish, algae,
                erosion, wildlife, clear. Use <code>unsure</code> for uncertain clarity, flow, or
                confidence. Known synthetic records can only enter a demo workspace.
              </p>
            </details>
            {preview && (
              <>
                <div className="import-preview-heading">
                  <FileText size={20} />
                  <div>
                    <b>{filename}</b>
                    <p>
                      {preview.rows.length} valid record{preview.rows.length === 1 ? '' : 's'} ·{' '}
                      {preview.errors.length} invalid record{preview.errors.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="tag">
                    {preview.sourceDemo
                      ? 'Synthetic source'
                      : preview.provenanceKnown
                        ? 'Source labelled'
                        : 'Source label missing'}
                  </span>
                </div>
                {preview.errors.length > 0 && (
                  <div className="import-errors" role="alert">
                    <b>No import will run until every row is valid.</b>
                    <ul>
                      {preview.errors.map((value) => (
                        <li key={value}>{value}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {syntheticBlocked && (
                  <p className="form-error" role="alert">
                    This file contains synthetic demonstration records. They cannot be added to this
                    real workspace. Use a demo workspace to practise.
                  </p>
                )}
                {needsClassification && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I have checked this file and confirm it contains real user-reported
                    observations, not synthetic or demonstration records.
                  </label>
                )}
                {sourceSites.length > 0 && (
                  <section className="import-mapping">
                    <h3>Match source sites</h3>
                    <p className="form-hint">
                      No location is guessed. Choose the existing monitoring point that actually
                      matches each source.
                    </p>
                    {sourceSites.map((site) => (
                      <label key={site.id}>
                        <span>
                          {site.name}
                          <small>Source: {site.id}</small>
                        </span>
                        <ArrowRight size={15} />
                        <select
                          aria-label={`Destination for ${site.name}`}
                          value={mapping[site.id] || ''}
                          onChange={(e) => setMapping({ ...mapping, [site.id]: e.target.value })}
                        >
                          <option value="">Choose a destination site…</option>
                          {data.sites.map((target) => (
                            <option value={target.id} key={target.id}>
                              {target.name} · {target.catchment}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </section>
                )}
                <div
                  className="import-preview-table"
                  tabIndex={0}
                  role="region"
                  aria-label="Observation import preview"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Record</th>
                        <th>Source site</th>
                        <th>Observed</th>
                        <th>Concerns</th>
                        <th>Field note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          <td>{row.sourceName}</td>
                          <td>{new Date(row.input.observedAt).toLocaleString()}</td>
                          <td>{row.input.concerns.map((c) => concernLabels[c]).join(', ')}</td>
                          <td>{row.input.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.warnings.map((warning) => (
                  <p className="form-hint" key={warning}>
                    {warning}
                  </p>
                ))}
              </>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button className="button ghost" disabled={busy} onClick={onClose}>
          {result ? 'Done' : 'Cancel'}
        </button>
        {!result && (
          <button className="button primary" disabled={!ready || busy} onClick={commit}>
            {busy ? <Spinner /> : <Upload size={16} />}Import {preview?.rows.length || 0} record
            {preview?.rows.length === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </Modal>
  );
}
