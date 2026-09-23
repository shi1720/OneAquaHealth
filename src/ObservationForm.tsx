import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Camera,
  Check,
  ShieldCheck,
  Info,
  CloudOff,
  Trash2,
} from 'lucide-react';
import type { Concern, WorkspaceData, ObservationInput } from '../shared/types';
import { Modal, StepLabel, Spinner } from './components';
import { client, concernLabels } from './api';
const choices: Concern[] = [
  'foam',
  'discoloration',
  'litter',
  'odour',
  'dead_fish',
  'algae',
  'erosion',
  'wildlife',
  'clear',
];
export default function ObservationForm({
  data,
  onClose,
  onSaved,
  initialSite,
}: {
  data: WorkspaceData;
  onClose: () => void;
  onSaved: (message: string) => void;
  initialSite?: string;
}) {
  const key = `rill-draft-${data.user.id}`;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(true);
  const photoRef = useRef<HTMLInputElement>(null);
  const [initialDraft] = useState<ObservationInput | null>(() => {
    try {
      const old = localStorage.getItem(key);
      if (old) {
        const parsed = JSON.parse(old);
        const age = Date.now() - parsed.savedAt;
        const candidate = parsed.form;
        if (
          age >= 0 &&
          age < 86400000 &&
          candidate &&
          data.sites.some((s) => s.id === candidate.siteId) &&
          Array.isArray(candidate.concerns) &&
          candidate.concerns.every((c: unknown) => choices.includes(c as Concern)) &&
          typeof candidate.notes === 'string' &&
          typeof candidate.observedAt === 'string' &&
          typeof candidate.clientId === 'string'
        )
          return candidate;
        localStorage.removeItem(key);
      }
    } catch {}
    return null;
  });
  // Capture the pre-existing draft during initialization. StrictMode replays
  // effects in development; reading storage after autosave would label a new
  // form as restored on the second effect pass.
  const [restored] = useState(Boolean(initialDraft));
  const [form, setForm] = useState<ObservationInput>(
    () =>
      initialDraft ?? {
        siteId: initialSite || data.sites[0]?.id || '',
        observedAt: new Date().toISOString(),
        concerns: [],
        clarity: 'unsure',
        flow: 'unsure',
        confidence: 'unsure',
        notes: '',
        photo: null,
        clientId: crypto.randomUUID(),
      },
  );
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ form, savedAt: Date.now() }));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [form, key]);
  function set<K extends keyof ObservationInput>(k: K, v: ObservationInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  }
  function toggle(c: Concern) {
    set(
      'concerns',
      form.concerns.includes(c)
        ? form.concerns.filter((v) => v !== c)
        : c === 'clear'
          ? ['clear']
          : [...form.concerns.filter((v) => v !== 'clear'), c],
    );
  }
  async function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Please choose an image smaller than 12 MB.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      set('photo', canvas.toDataURL('image/jpeg', 0.72));
      bitmap.close();
    } catch {
      setError('This image could not be read. Please try another photo.');
    }
  }
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await client.observe(form);
      try {
        localStorage.removeItem(key);
      } catch {}
      onSaved('Observation recorded. Your report now has a next step.');
    } catch (e) {
      setError(
        (e as Error).message +
          (draftSaved
            ? ' Your draft is saved on this device.'
            : ' Keep this form open to retain your entry.'),
      );
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (step === 0 && !form.siteId) {
      setError('Choose a monitoring site.');
      return;
    }
    if (step === 1 && form.concerns.length === 0) {
      setError('Select what you noticed, including “No visible concern” if appropriate.');
      return;
    }
    if (step === 2 && form.notes.trim().length < 8) {
      setError('Please add a short field note of at least 8 characters.');
      return;
    }
    setError('');
    setStep(step + 1);
  }
  return (
    <Modal
      title="Every observation helps."
      subtitle="A few careful details make the next decision better."
      onClose={onClose}
      wide
    >
      <StepLabel items={['Place', 'Observe', 'Details', 'Review']} current={step} />
      <div className="form-body">
        {!draftSaved && (
          <div className="inline-note warning">
            Your browser could not save a draft. Keep this form open until submission.
          </div>
        )}
        {restored && (
          <div className="inline-note">
            <CloudOff size={16} /> Your last draft was restored. Drafts stay on this device for 24
            hours.
          </div>
        )}
        {step === 0 && (
          <>
            <h3>Where are you observing?</h3>
            <p className="muted">Choose a place your team monitors. Stay on a safe public path.</p>
            <div className="site-choices">
              {data.sites.map((s) => (
                <button
                  key={s.id}
                  className={`site-choice ${form.siteId === s.id ? 'selected' : ''}`}
                  onClick={() => set('siteId', s.id)}
                >
                  <span className="site-choice-icon">
                    <MapPin size={18} />
                  </span>
                  <div>
                    <b>{s.name}</b>
                    <span>{s.description}</span>
                  </div>
                  {form.siteId === s.id && <Check size={18} />}
                </button>
              ))}
            </div>
            {!data.sites.length && (
              <p className="inline-note">
                Add a monitoring site in Team & settings before creating an observation.
              </p>
            )}
            <label>
              When did you observe it?
              <input
                type="datetime-local"
                value={new Date(
                  new Date(form.observedAt).getTime() -
                    new Date(form.observedAt).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)}
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)}
                onChange={(e) => {
                  if (e.target.value) set('observedAt', new Date(e.target.value).toISOString());
                }}
              />
            </label>
            <div className="safety-note">
              <ShieldCheck size={20} />
              <p>
                <b>Look from the bank.</b> Don’t enter the water, touch wildlife, or approach a
                hazardous area to make a report.
              </p>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h3>What caught your eye?</h3>
            <p className="muted">
              Describe what you can see or smell. You don’t need to identify the cause.
            </p>
            <div className="concern-choices">
              {choices.map((c) => (
                <button
                  key={c}
                  className={form.concerns.includes(c) ? 'selected' : ''}
                  onClick={() => toggle(c)}
                >
                  <span className="choice-dot">
                    {form.concerns.includes(c) && <Check size={12} />}
                  </span>
                  {concernLabels[c]}
                </button>
              ))}
            </div>
            {form.concerns.includes('foam') && (
              <div className="inline-note">
                <Info size={19} />
                <span>
                  Foam can have natural or human causes. An observation alone cannot tell us which.
                  A follow-up comparison can help.
                </span>
              </div>
            )}
            {form.concerns.includes('dead_fish') && (
              <div className="inline-note warning">
                <ShieldCheck size={21} />
                <span>
                  <b>Report serious incidents promptly.</b> Keep your distance and contact your
                  local environmental authority. Don’t wait for a Rill review.
                </span>
              </div>
            )}
            <div className="form-grid">
              <label>
                Water clarity
                <select
                  value={form.clarity}
                  onChange={(e) => set('clarity', e.target.value as ObservationInput['clarity'])}
                >
                  <option value="unsure">Not sure</option>
                  <option value="clear">Clear — I can see through it</option>
                  <option value="cloudy">Cloudy — partly see through it</option>
                  <option value="opaque">Opaque — cannot see through it</option>
                </select>
              </label>
              <label>
                Water movement
                <select
                  value={form.flow}
                  onChange={(e) => set('flow', e.target.value as ObservationInput['flow'])}
                >
                  <option value="unsure">Not sure</option>
                  <option value="still">Still</option>
                  <option value="slow">Slow</option>
                  <option value="steady">Steady</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Give the next person a clearer picture.</h3>
            <label>
              Your field note
              <textarea
                placeholder="For example: a small patch of white foam below the footbridge. I observed from the public path. I couldn't see the upstream side."
                rows={4}
                maxLength={2000}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
              <span className="form-hint">
                Avoid names, faces, private addresses, or guesses about pollution sources.
              </span>
            </label>
            <label>
              How certain are you about what you observed?
              <select
                value={form.confidence}
                onChange={(e) =>
                  set('confidence', e.target.value as ObservationInput['confidence'])
                }
              >
                <option value="unsure">I’m not sure — help me check</option>
                <option value="fairly_sure">Fairly sure</option>
                <option value="certain">Certain about what I observed</option>
              </select>
            </label>
            <input
              ref={photoRef}
              type="file"
              aria-label="Observation photo"
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              onChange={photo}
            />
            {form.photo ? (
              <div className="photo-preview">
                <img src={form.photo} alt="Your observation attachment" />
                <button className="button secondary" onClick={() => set('photo', null)}>
                  <Trash2 size={15} />
                  Remove photo
                </button>
              </div>
            ) : (
              <button className="photo-upload" onClick={() => photoRef.current?.click()}>
                <Camera size={24} />
                <b>Add a photo</b>
                <span>Optional · JPEG, PNG, WebP · Image metadata removed</span>
              </button>
            )}
            <p className="form-hint">
              Photos support human review. Rill does not classify pollution from images.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <div className="review-summary">
              <span className="eyebrow">READY FOR YOUR TEAM</span>
              <h3>{data.sites.find((s) => s.id === form.siteId)?.name}</h3>
              <p>{new Date(form.observedAt).toLocaleString()}</p>
              <div className="tag-list">
                {form.concerns.map((c) => (
                  <span className="tag" key={c}>
                    {concernLabels[c]}
                  </span>
                ))}
              </div>
              <dl>
                <div>
                  <dt>Clarity</dt>
                  <dd>{form.clarity}</dd>
                </div>
                <div>
                  <dt>Flow</dt>
                  <dd>{form.flow}</dd>
                </div>
                <div>
                  <dt>Your confidence</dt>
                  <dd>{form.confidence.replace('_', ' ')}</dd>
                </div>
              </dl>
              {form.notes && <blockquote>{form.notes}</blockquote>}
              {form.photo && (
                <img className="review-photo" src={form.photo} alt="Photo to submit" />
              )}
            </div>
            <div className="safety-note">
              <Check size={20} />
              <p>
                <b>Here’s what happens next.</b> Rill adds this to your team’s review queue with an
                explained verification priority. A coordinator decides the response.
              </p>
            </div>
            {data.user.isDemo && (
              <p className="form-hint">
                You’re in a demo workspace. This report will be labelled as demonstration data.
              </p>
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
        <button className="button ghost" onClick={() => (step > 0 ? setStep(step - 1) : onClose())}>
          <ArrowLeft size={16} />
          {step > 0 ? 'Back' : draftSaved ? 'Save draft & close' : 'Close form'}
        </button>
        {step < 3 ? (
          <button className="button primary" onClick={next} disabled={!data.sites.length}>
            Continue
            <ArrowRight size={16} />
          </button>
        ) : (
          <button className="button primary" disabled={busy} onClick={submit}>
            {busy ? <Spinner /> : <Check size={16} />}Submit observation
          </button>
        )}
      </div>
    </Modal>
  );
}
