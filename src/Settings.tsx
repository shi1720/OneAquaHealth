import { useEffect, useState, type FormEvent } from 'react';
import {
  Users,
  MapPin,
  Plus,
  ShieldCheck,
  Lock,
  Download,
  LogOut,
  Trash2,
  Info,
  ArrowUpRight,
  Pencil,
  Globe,
  Search,
  Upload,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import type { WorkspaceData, Site, User } from '../shared/types';
import { api } from './api';
import { Modal, Spinner, SectionTitle } from './components';
import Import from './Import';
import './settings-extra.css';

type Dialog = 'site' | 'member' | 'delete' | 'password' | 'remove' | 'catalog' | null;
interface CatalogSite {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}
interface Catalog {
  source: string;
  retrievedAt: string;
  sites: CatalogSite[];
  notice: string;
}
export default function Settings({
  data,
  onChanged,
  onLogout,
}: {
  data: WorkspaceData;
  onChanged: (message: string) => Promise<void>;
  onLogout: () => void;
}) {
  const coordinator = data.user.role === 'coordinator';
  const [modal, setModal] = useState<Dialog>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState('');
  const [editing, setEditing] = useState<Site | null>(null),
    [siteDraft, setSiteDraft] = useState<Partial<Site>>({}),
    [catalogOrigin, setCatalogOrigin] = useState(''),
    [accessVerified, setAccessVerified] = useState(false),
    [restricted, setRestricted] = useState(false);
  const [members, setMembers] = useState<User[]>([]),
    [membersBusy, setMembersBusy] = useState(false),
    [membersError, setMembersError] = useState(''),
    [rosterVersion, setRosterVersion] = useState(0),
    [removing, setRemoving] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [catalogBusy, setCatalogBusy] = useState(false),
    [catalogError, setCatalogError] = useState(''),
    [search, setSearch] = useState(''),
    [city, setCity] = useState('all'),
    [importOpen, setImportOpen] = useState(false);
  useEffect(() => {
    if (!coordinator) return;
    let alive = true;
    setMembersBusy(true);
    setMembersError('');
    api<{ members: User[] }>('/members')
      .then((result) => {
        if (alive) setMembers(result.members);
      })
      .catch((e) => {
        if (alive) setMembersError(e.message);
      })
      .finally(() => {
        if (alive) setMembersBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [coordinator, data.user.workspaceId, rosterVersion]);
  function close() {
    if (!busy) {
      setModal(null);
      setError('');
    }
  }
  function open(value: Dialog) {
    setError('');
    setConfirm('');
    setModal(value);
  }
  function siteForm(site?: Site) {
    setEditing(site || null);
    setSiteDraft(site || {});
    setCatalogOrigin('');
    setAccessVerified(false);
    setRestricted(site?.sensitive ?? false);
    open('site');
  }
  async function loadCatalog() {
    setCatalogBusy(true);
    setCatalogError('');
    try {
      setCatalog(await api<Catalog>('/catalog/oneaquahealth'));
    } catch (e) {
      setCatalogError((e as Error).message);
    } finally {
      setCatalogBusy(false);
    }
  }
  function openCatalog() {
    open('catalog');
    if (!catalog) void loadCatalog();
  }
  function useCatalog(site: CatalogSite) {
    setEditing(null);
    setSiteDraft({
      name: site.name.slice(0, 100),
      catchment: site.city,
      lat: site.lat,
      lng: site.lng,
      description: `Site ${site.code} from the OneAquaHealth directory. Local monitoring context requires coordinator review.`,
      habitat: '',
      access: '',
      exposure: 0,
      walkMinutes: 15,
      sensitive: true,
    });
    setCatalogOrigin(`${site.code} · ${site.city}`);
    setAccessVerified(false);
    setRestricted(true);
    open('site');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      if (modal === 'site') {
        const body = {
          name: f.get('name'),
          catchment: f.get('catchment'),
          description: f.get('description'),
          lat: Number(f.get('lat')),
          lng: Number(f.get('lng')),
          habitat: f.get('habitat'),
          access: f.get('access'),
          exposure: Number(f.get('exposure')),
          walkMinutes: Number(f.get('walkMinutes')),
          sensitive: restricted || Boolean(catalogOrigin && !accessVerified),
        };
        await api(editing ? `/sites/${editing.id}` : '/sites', body, editing ? 'PATCH' : 'POST');
        await onChanged(
          editing
            ? 'Monitoring site updated. Access context applies to future planning.'
            : 'Monitoring site added. Your team can now record observations.',
        );
      } else if (modal === 'member') {
        await api('/members', {
          name: f.get('name'),
          email: f.get('email'),
          password: f.get('password'),
        });
        setRosterVersion((v) => v + 1);
        await onChanged('Volunteer account created. Share the sign-in details privately.');
      } else if (modal === 'password') {
        if (f.get('newPassword') !== f.get('repeatPassword'))
          throw new Error('The new passphrases do not match.');
        await api('/auth/password', {
          currentPassword: f.get('currentPassword'),
          newPassword: f.get('newPassword'),
        });
        await onChanged('Passphrase changed. Other sessions have been signed out.');
      } else if (modal === 'remove' && removing) {
        await api(`/members/${removing.id}`, {}, 'DELETE');
        setRosterVersion((v) => v + 1);
        await onChanged(
          `${removing.name} no longer has workspace access. Historical evidence is retained.`,
        );
      } else if (modal === 'delete') {
        await api('/account', { password: f.get('password') || '' }, 'DELETE');
        onLogout();
      }
      setModal(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cities = [...new Set(catalog?.sites.map((site) => site.city) || [])].sort();
  const catalogMatches =
    catalog?.sites.filter(
      (site) =>
        (city === 'all' || site.city === city) &&
        `${site.name} ${site.city} ${site.code}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2>{data.user.workspaceName}</h2>
          <p>
            {data.user.isDemo
              ? 'An isolated sample workspace. Your changes here only affect this demonstration.'
              : 'Your team’s private space for observation, review, and follow-through.'}
          </p>
          <div className="profile-card">
            <span className="avatar">
              {data.user.name
                .split(' ')
                .map((value) => value[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <b>{data.user.name}</b>
              <small>{data.user.email}</small>
            </div>
            <span className="tag">{data.user.role}</span>
          </div>
          <div className="settings-actions">
            <button className="button secondary" onClick={onLogout}>
              <LogOut size={16} />
              Sign out
            </button>
            {!data.user.isDemo && (
              <button className="button secondary" onClick={() => open('password')}>
                <KeyRound size={16} />
                Change passphrase
              </button>
            )}
          </div>
          {data.user.isDemo && (
            <p className="form-hint">
              Demo accounts have no passphrase. Create a real workspace to use account security
              controls.
            </p>
          )}
        </section>
        <section className="panel settings-card">
          <span className="eyebrow">WORK BETTER TOGETHER</span>
          <h2>A team around the stream.</h2>
          <p>
            Coordinators review evidence and plan fieldwork. Volunteers contribute observations and
            complete their assigned tasks.
          </p>
          <div className="role-descriptions">
            <span>
              <ShieldCheck size={17} />
              <b>Coordinator</b> Review, assign, and manage
            </span>
            <span>
              <Users size={17} />
              <b>Volunteer</b> Observe and follow through
            </span>
          </div>
          {coordinator ? (
            <>
              <button className="button primary" onClick={() => open('member')}>
                <Plus size={16} />
                Add a volunteer
              </button>
              <p className="form-hint">
                Creates an account immediately. No invitation email is sent.
              </p>
            </>
          ) : (
            <p className="form-hint">Your coordinator manages membership and monitoring sites.</p>
          )}
        </section>
      </div>
      {coordinator && (
        <section className="panel settings-roster">
          <SectionTitle eyebrow="PEOPLE WITH ACCESS" title="Your team">
            <span className="small-muted">
              {members.length} member{members.length === 1 ? '' : 's'}
            </span>
          </SectionTitle>
          {membersBusy ? (
            <div className="settings-loading">
              <Spinner />
              Loading team members…
            </div>
          ) : membersError ? (
            <div className="settings-inline-error" role="alert">
              {membersError}
              <button
                className="button secondary small"
                onClick={() => setRosterVersion((v) => v + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            members.map((member) => (
              <div className="member-row" key={member.id}>
                <span className="avatar">
                  {member.name
                    .split(' ')
                    .map((value) => value[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div>
                  <b>
                    {member.name}
                    {member.id === data.user.id ? ' (you)' : ''}
                  </b>
                  <small>{member.email}</small>
                </div>
                <span className="tag">{member.role}</span>
                {member.role === 'volunteer' && (
                  <button
                    className="button ghost small"
                    aria-label={`Remove ${member.name}`}
                    onClick={() => {
                      setRemoving(member);
                      open('remove');
                    }}
                  >
                    <Trash2 size={14} />
                    Remove access
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      )}
      <section className="panel sites-settings">
        <SectionTitle title="Your monitoring sites">
          {coordinator && (
            <div className="settings-actions">
              <button className="button secondary small" onClick={openCatalog}>
                <Globe size={15} />
                Explore OneAquaHealth sites
              </button>
              <button className="button secondary small" onClick={() => siteForm()}>
                <Plus size={16} />
                Add a site
              </button>
            </div>
          )}
        </SectionTitle>
        {data.sites.length ? (
          data.sites.map((site) => (
            <div className="settings-site" key={site.id}>
              <span className="site-choice-icon">
                <MapPin size={17} />
              </span>
              <div>
                <b>{site.name}</b>
                <p>{site.access}</p>
                <small className="site-coordinates">
                  {site.catchment} · {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                </small>
              </div>
              <span>{site.walkMinutes} min access</span>
              <span className="tag">{site.sensitive ? 'Restricted' : 'Public bank'}</span>
              {coordinator && (
                <button
                  className="icon-button"
                  aria-label={`Edit ${site.name}`}
                  onClick={() => siteForm(site)}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty">
            <MapPin size={28} />
            <h3>Start with a place that matters.</h3>
            <p>Add a monitoring point and document its local access conditions.</p>
            {coordinator && (
              <button className="button primary" onClick={() => siteForm()}>
                Add your first site
                <Plus size={16} />
              </button>
            )}
          </div>
        )}
      </section>
      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="eyebrow">PRIVACY & PORTABILITY</span>
          <h3>Your data, with care.</h3>
          <p>
            Workspace data is private to your team. Avoid personal health details, faces, and exact
            locations of sensitive species. Drafts stay on this device for up to 24 hours.
          </p>
          <div className="settings-links">
            {coordinator && (
              <a href="/api/export?format=json" download>
                <Download size={16} />
                Download your workspace
              </a>
            )}
            <a
              href="https://github.com/shi1720/OneAquaHealth/blob/main/docs/privacy.md"
              target="_blank"
              rel="noreferrer"
            >
              <Lock size={16} />
              Read our data practices
              <ArrowUpRight size={13} />
            </a>
          </div>
          {coordinator && (
            <>
              <button
                className="button secondary"
                disabled={!data.sites.length}
                onClick={() => setImportOpen(true)}
              >
                <Upload size={16} />
                Import observations
              </button>
              <p className="form-hint">
                {data.sites.length
                  ? 'CSV or JSON · preview and explicitly match source sites before importing.'
                  : 'Add a monitoring site before importing existing observations.'}
              </p>
              <button className="danger-link" onClick={() => open('delete')}>
                <Trash2 size={14} />
                Delete this workspace
              </button>
            </>
          )}
        </section>
        <section className="panel settings-card about-card">
          <span className="eyebrow">BUILT FOR ONE HEALTH</span>
          <h3>
            A little stream.
            <br />A shared responsibility.
          </h3>
          <p>
            Rill is an independent project by Shivam Gupta for the OneAquaHealth IEEE Global
            Hackathon 2026. It complements citizen science tools with fieldwork planning and
            follow-through.
          </p>
          <span className="engine-label">Engine {data.engineVersion} · Open source</span>
          <a
            href="https://github.com/shi1720/OneAquaHealth"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            Source & methodology
            <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      {modal === 'catalog' ? (
        <Modal
          title="Explore OneAquaHealth sites"
          subtitle="A live directory to help you identify a monitoring location."
          onClose={close}
          wide
        >
          <div className="form-body catalog-body">
            <div className="inline-note">
              <Globe size={20} />
              <span>
                Directory coordinates are a starting point. They do not establish public access,
                safety, permission, or an affiliation with this project. No environmental assessment
                results are imported.
              </span>
            </div>
            {catalogBusy && (
              <div className="settings-loading" role="status">
                <Spinner />
                Reading the live site directory…
              </div>
            )}
            {catalogError && (
              <div className="settings-inline-error" role="alert">
                <p>{catalogError}</p>
                <button className="button secondary small" onClick={loadCatalog}>
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            )}
            {catalog && (
              <>
                <div className="catalog-filters">
                  <label>
                    <Search size={15} />
                    <input
                      aria-label="Search directory sites"
                      placeholder="Search site name, code, or city…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter directory by city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  >
                    <option value="all">All cities</option>
                    {cities.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="catalog-source">
                  <span>
                    {catalogMatches.length} matching sites · retrieved{' '}
                    {new Date(catalog.retrievedAt).toLocaleString()}
                  </span>
                  <a
                    href={catalog.source.startsWith('https://') ? catalog.source : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source
                    <ArrowUpRight size={13} />
                  </a>
                </div>
                <div className="catalog-list">
                  {catalogMatches.map((site) => (
                    <button
                      className="catalog-row"
                      key={site.code}
                      onClick={() => useCatalog(site)}
                    >
                      <MapPin size={18} />
                      <span>
                        <b>{site.name}</b>
                        <small>
                          {site.city} · {site.code} · {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                        </small>
                      </span>
                      <span className="catalog-use">
                        Review & add
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  ))}
                  {!catalogMatches.length && (
                    <p className="muted">No sites match. Try another name or city.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="button ghost" onClick={close}>
              Close
            </button>
            <button className="button secondary" onClick={() => siteForm()}>
              <Plus size={16} />
              Add a local site manually
            </button>
          </div>
        </Modal>
      ) : (
        modal && (
          <Modal
            title={
              modal === 'site'
                ? editing
                  ? 'Edit monitoring site'
                  : 'Add a monitoring site'
                : modal === 'member'
                  ? 'Bring a volunteer on board'
                  : modal === 'password'
                    ? 'Change your passphrase'
                    : modal === 'remove'
                      ? 'Remove workspace access'
                      : 'Delete this workspace'
            }
            onClose={close}
          >
            <form onSubmit={submit}>
              <div className="form-body">
                {modal === 'site' ? (
                  <>
                    {catalogOrigin && (
                      <div className="inline-note">
                        <Globe size={19} />
                        <span>
                          Prefilled from the live directory: {catalogOrigin}. Add your own habitat
                          and access context. This site stays excluded from volunteer plans until
                          you verify permissions and safe access.
                        </span>
                      </div>
                    )}
                    <label>
                      Site name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        defaultValue={siteDraft.name}
                        placeholder="North footbridge"
                      />
                    </label>
                    <label>
                      Catchment
                      <input
                        name="catchment"
                        required
                        minLength={2}
                        maxLength={100}
                        defaultValue={siteDraft.catchment}
                        placeholder="Our local stream"
                      />
                    </label>
                    <label>
                      Site description
                      <textarea
                        name="description"
                        required
                        minLength={8}
                        maxLength={500}
                        rows={2}
                        defaultValue={siteDraft.description}
                        placeholder="Describe this point along the stream."
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Latitude
                        <input
                          name="lat"
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          required
                          defaultValue={siteDraft.lat}
                          placeholder="40.2033"
                        />
                      </label>
                      <label>
                        Longitude
                        <input
                          name="lng"
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          required
                          defaultValue={siteDraft.lng}
                          placeholder="-8.4103"
                        />
                      </label>
                    </div>
                    <label>
                      Habitat
                      <input
                        name="habitat"
                        required
                        minLength={2}
                        maxLength={100}
                        defaultValue={siteDraft.habitat}
                        placeholder="Urban stream with vegetated banks"
                      />
                    </label>
                    <label>
                      Safe access instructions
                      <textarea
                        name="access"
                        required
                        minLength={12}
                        maxLength={500}
                        rows={2}
                        defaultValue={siteDraft.access}
                        placeholder="Describe the verified viewpoint, permissions, and restrictions."
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Public access context
                        <select name="exposure" defaultValue={siteDraft.exposure ?? 2}>
                          <option value="0">No regular public use (0)</option>
                          <option value="1">Occasional use (1)</option>
                          <option value="2">Public walking path (2)</option>
                          <option value="3">Popular community access (3)</option>
                          <option value="4">Busy recreation access (4)</option>
                          <option value="5">Heavily used recreation area (5)</option>
                        </select>
                      </label>
                      <label>
                        Estimated access time (minutes)
                        <input
                          name="walkMinutes"
                          type="number"
                          min="5"
                          max="240"
                          defaultValue={siteDraft.walkMinutes ?? 15}
                          required
                        />
                      </label>
                    </div>
                    {catalogOrigin && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={accessVerified}
                          onChange={(event) => {
                            setAccessVerified(event.target.checked);
                            if (!event.target.checked) setRestricted(true);
                          }}
                        />
                        I have checked local permissions and safe access at this monitoring point.
                      </label>
                    )}
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={restricted}
                        disabled={Boolean(catalogOrigin && !accessVerified)}
                        onChange={(event) => setRestricted(event.target.checked)}
                      />
                      Restricted, sensitive, or access unverified. Exclude from volunteer plans.
                    </label>
                  </>
                ) : modal === 'member' ? (
                  <>
                    <p className="muted">
                      The new account joins this workspace as a volunteer. Share credentials through
                      a private channel. They can change their passphrase in settings.
                    </p>
                    <label>
                      Full name
                      <input name="name" required minLength={2} maxLength={80} />
                    </label>
                    <label>
                      Email
                      <input name="email" type="email" required maxLength={254} />
                    </label>
                    <label>
                      Initial passphrase
                      <input
                        name="password"
                        type="password"
                        minLength={12}
                        maxLength={128}
                        required
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                      />
                    </label>
                    <div className="inline-note">
                      <Info size={18} />
                      Use a unique passphrase agreed with the volunteer. Invitation emails and
                      forgotten-password recovery are not connected.
                    </div>
                  </>
                ) : modal === 'password' ? (
                  <>
                    <p className="muted">
                      Use at least 12 characters. Changing your passphrase signs out other sessions
                      and keeps this browser signed in.
                    </p>
                    <label>
                      Current passphrase
                      <input
                        name="currentPassword"
                        type="password"
                        required
                        maxLength={128}
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      New passphrase
                      <input
                        name="newPassword"
                        type="password"
                        required
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      Repeat new passphrase
                      <input
                        name="repeatPassword"
                        type="password"
                        required
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                      />
                    </label>
                  </>
                ) : modal === 'remove' ? (
                  <>
                    <p>
                      Remove <b>{removing?.name}</b> from this workspace?
                    </p>
                    <p className="muted">
                      Their sessions are revoked immediately. Existing observations and historical
                      task attribution remain. Complete or cancel any open assignments before
                      removing access.
                    </p>
                    <label>
                      Type REMOVE to confirm
                      <input
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        autoComplete="off"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p className="form-error">
                      This permanently deletes all observations, tasks, and member accounts in{' '}
                      {data.user.workspaceName}. Download an export first if you need a copy.
                    </p>
                    {!data.user.isDemo && (
                      <label>
                        Your password
                        <input
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                        />
                      </label>
                    )}
                    <label>
                      Type DELETE to confirm
                      <input
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        autoComplete="off"
                        required
                      />
                    </label>
                  </>
                )}
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="button ghost" disabled={busy} onClick={close}>
                  Cancel
                </button>
                <button
                  className={`button ${modal === 'delete' || modal === 'remove' ? 'danger' : 'primary'}`}
                  disabled={
                    busy ||
                    (modal === 'delete' && confirm !== 'DELETE') ||
                    (modal === 'remove' && confirm !== 'REMOVE')
                  }
                >
                  {busy ? (
                    <Spinner />
                  ) : modal === 'delete' || modal === 'remove' ? (
                    <Trash2 size={16} />
                  ) : modal === 'password' ? (
                    <KeyRound size={16} />
                  ) : modal === 'site' && editing ? (
                    <Pencil size={16} />
                  ) : (
                    <Plus size={16} />
                  )}{' '}
                  {modal === 'site'
                    ? editing
                      ? 'Save site changes'
                      : 'Add site'
                    : modal === 'member'
                      ? 'Create volunteer account'
                      : modal === 'password'
                        ? 'Change passphrase'
                        : modal === 'remove'
                          ? 'Remove access'
                          : 'Delete permanently'}
                </button>
              </div>
            </form>
          </Modal>
        )
      )}
      {importOpen && (
        <Import data={data} onClose={() => setImportOpen(false)} onChanged={onChanged} />
      )}
    </>
  );
}
