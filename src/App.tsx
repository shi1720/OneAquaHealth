import { useState, useEffect, useCallback, Component, type ReactNode } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Route,
  Leaf,
  Settings2,
  Plus,
  ChevronDown,
  ArrowUpRight,
  Bell,
  Menu,
  X,
  Check,
  RefreshCw,
  CloudOff,
  HelpCircle,
  BookOpen,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import type { User, WorkspaceData } from '../shared/types';
import { api, client, ApiError } from './api';
import { Logo, Spinner, Modal } from './components';
import Auth from './Auth';
import Overview, { Observations } from './Overview';
import ObservationForm from './ObservationForm';
import Detail from './Detail';
import Planner from './Planner';
import Evidence from './Evidence';
import Settings from './Settings';
const nav = [
  { id: 'overview', label: 'Catchment overview', icon: LayoutDashboard },
  { id: 'observations', label: 'Observations', icon: ScanLine },
  { id: 'planner', label: 'Field planner', icon: Route },
  { id: 'evidence', label: 'Impact & evidence', icon: Leaf },
];
const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'A LITTLE ATTENTION GOES A LONG WAY',
    title: 'Your catchment, connected.',
    description: 'Good observations. Informed decisions. A healthier stream.',
  },
  observations: {
    eyebrow: 'THE COMMUNITY IS LOOKING',
    title: 'Small signals. Shared understanding.',
    description: 'Review what people noticed and decide what needs a closer look.',
  },
  planner: {
    eyebrow: 'LESS GUESSWORK. BETTER FIELDWORK.',
    title: 'The next best visit.',
    description: 'Make the most of the time your team has, with a reason for every choice.',
  },
  evidence: {
    eyebrow: 'BEYOND THE FIRST REPORT',
    title: 'Follow-through makes the difference.',
    description: 'Connect observations to action, and carry the evidence forward.',
  },
  settings: {
    eyebrow: 'YOUR TEAM, YOUR CATCHMENT',
    title: 'A place to work together.',
    description: 'Manage your monitoring sites, people, and workspace data.',
  },
};
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal">
          <Logo />
          <h1>Let’s get back to the stream.</h1>
          <p>This view couldn’t load. Your saved work is still in your workspace.</p>
          <button className="button primary" onClick={() => location.reload()}>
            Reload workspace
            <RefreshCw size={16} />
          </button>
        </main>
      );
    return this.props.children;
  }
}
function Application() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [init, setInit] = useState(true);
  const [page, setPage] = useState('overview');
  const [observation, setObservation] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [guide, setGuide] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    client
      .me()
      .then(({ user }) => setUser(user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e.message);
      })
      .finally(() => setInit(false));
    const up = () => setOnline(true),
      down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  const load = useCallback(async () => {
    try {
      const result = await client.workspace();
      setData(result);
      setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setData(null);
      } else setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function changed(message: string) {
    await load();
    setToast(message);
  }
  async function logout() {
    try {
      await client.logout();
    } catch {
      setError('Unable to sign out while offline. Reconnect and try again.');
      return;
    }
    if (user) localStorage.removeItem(`rill-draft-${user.id}`);
    setUser(null);
    setData(null);
    setPage('overview');
  }
  function navigate(v: string) {
    setPage(v);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (init)
    return (
      <div className="initial-loading">
        <Logo />
        <Spinner />
        <p>Getting the catchment ready…</p>
      </div>
    );
  if (!user)
    return (
      <>
        <Auth
          onLogin={(u) => {
            setUser(u);
            setError('');
          }}
        />
        {error && (
          <div className="connection-error" role="alert">
            {error}
            <button onClick={() => location.reload()}>Retry</button>
          </div>
        )}
      </>
    );
  if (!data)
    return (
      <div className="initial-loading">
        <Logo />
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="button primary" onClick={load}>
              Retry
              <RefreshCw size={16} />
            </button>
            <button className="button ghost" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Spinner />
            <p>Loading your workspace…</p>
          </>
        )}
      </div>
    );
  const meta = titles[page];
  const reviewCount = data.observations.filter((o) => o.status === 'new').length;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menu && <div className="sidebar-scrim" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-close"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <button className="workspace-select" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">
            <Leaf size={18} />
          </span>
          <div>
            <b>{data.user.isDemo ? 'Coimbra catchment' : data.user.workspaceName}</b>
            <span>{data.user.isDemo ? 'Community workspace' : 'Team workspace'}</span>
          </div>
          <ChevronDown size={14} />
        </button>
        <span className="sidebar-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              className={page === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === 'observations' && reviewCount > 0 && (
                <b className="nav-count">{reviewCount}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-story">
          <span className="sidebar-sprout">
            <Leaf size={21} />
          </span>
          <h3>
            Small streams.
            <br />
            Big connections.
          </h3>
          <p>The health of water, wildlife, and people flows together.</p>
          <button onClick={() => navigate('evidence')}>
            The One Health connection
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={18} />
            Team & settings
          </button>
          <button onClick={() => setGuide(true)}>
            <HelpCircle size={18} />A quick field guide
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="sidebar-user">
          <span className="avatar">
            {user.name
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div>
            <b>{user.name}</b>
            <span>
              {user.role === 'coordinator' ? 'Catchment coordinator' : 'Community volunteer'}
            </span>
          </div>
          <button className="icon-button" aria-label="Sign out" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <b>{nav.find((v) => v.id === page)?.label || 'Team & settings'}</b>
          </div>
          <div className="topbar-right">
            {user.isDemo && (
              <span className="demo-badge">
                <i />
                DEMO · SAMPLE DATA
              </span>
            )}
            <span className="topbar-date">
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button
              className="icon-button refresh-button"
              aria-label="Refresh workspace"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
                setToast('Workspace refreshed.');
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
            <button
              className="notification-button"
              aria-label={`${reviewCount} observations awaiting review`}
              onClick={() => navigate('observations')}
            >
              <Bell size={18} />
              {reviewCount > 0 && <i />}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner">
            <CloudOff size={16} />
            You’re offline. You can continue a draft; reconnect before submitting or changing a
            decision.
          </div>
        )}
        {error && (
          <div className="inline-error" role="alert">
            {error}
            <button onClick={load}>Try again</button>
          </div>
        )}
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{meta.eyebrow}</span>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <button
              className="button primary add-observation"
              onClick={() => {
                if (!data.sites.length) {
                  navigate('settings');
                  setToast('Add your first monitoring site to start observing.');
                } else setObservation(true);
              }}
            >
              <Plus size={18} />
              New observation
            </button>
          </div>
          {data.assessments.filter(
            (a) =>
              a.priority === 'urgent' &&
              data.observations.some((o) => o.id === a.observationId && o.status !== 'resolved'),
          ).length > 0 && (
            <div className="urgent-referrals" role="alert">
              <div>
                <b>Immediate authority referral needed</b>
                <p>
                  Reported fish distress needs prompt local authority advice. Keep your distance; do
                  not wait for a field plan.
                </p>
              </div>
              <div>
                {data.assessments
                  .filter(
                    (a) =>
                      a.priority === 'urgent' &&
                      data.observations.some(
                        (o) => o.id === a.observationId && o.status !== 'resolved',
                      ),
                  )
                  .map((a) => (
                    <button key={a.observationId} onClick={() => setDetail(a.observationId)}>
                      Review{' '}
                      {
                        data.sites.find(
                          (s) =>
                            s.id ===
                            data.observations.find((o) => o.id === a.observationId)?.siteId,
                        )?.name
                      }
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
              </div>
            </div>
          )}
          {page === 'overview' && (
            <Overview
              data={data}
              onOpen={setDetail}
              onPage={navigate}
              onObserve={() => (data.sites.length ? setObservation(true) : navigate('settings'))}
            />
          )}{' '}
          {page === 'observations' && (
            <Observations
              data={data}
              onOpen={setDetail}
              onObserve={() => (data.sites.length ? setObservation(true) : navigate('settings'))}
            />
          )}{' '}
          {page === 'planner' && <Planner data={data} onOpen={setDetail} onChanged={changed} />}{' '}
          {page === 'evidence' && <Evidence data={data} onOpen={setDetail} />}{' '}
          {page === 'settings' && <Settings data={data} onChanged={changed} onLogout={logout} />}
          <footer className="app-footer">
            <span>
              <span className="live-dot" />
              Every observation a next step.
            </span>
            <span>
              Built by Shivam Gupta <i>·</i> OneAquaHealth IEEE 2026
            </span>
          </footer>
        </main>
      </div>
      {observation && (
        <ObservationForm
          data={data}
          onClose={() => setObservation(false)}
          onSaved={(m) => {
            setObservation(false);
            changed(m);
          }}
        />
      )}
      {detail && data.observations.some((o) => o.id === detail) && (
        <Detail
          key={detail}
          id={detail}
          data={data}
          onClose={() => setDetail(null)}
          onChanged={changed}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {guide && (
        <Modal
          title="A few minutes. A useful observation."
          subtitle="Your quick guide to thoughtful stream stewardship."
          onClose={() => setGuide(false)}
        >
          <div className="form-body guide-body">
            <ol>
              <li>
                <b>Find a safe place to look.</b>
                <p>
                  Use public paths. Stay out of the water, away from unstable banks, and respect
                  private land.
                </p>
              </li>
              <li>
                <b>Describe what you notice.</b>
                <p>
                  Water appearance, flow, litter, wildlife, or changes to the bank. “Not sure” is a
                  useful answer.
                </p>
              </li>
              <li>
                <b>Separate what you see from what it means.</b>
                <p>
                  Foam can be natural. Clear water can still contain contaminants. Rill supports
                  verification, not a safety verdict.
                </p>
              </li>
              <li>
                <b>Close the loop.</b>
                <p>
                  A coordinator reviews the report, assigns a next step, and records a recheck. Your
                  observation starts that process.
                </p>
              </li>
            </ol>
            <div className="inline-note warning">
              <ShieldText />
              Serious incidents need prompt reporting to the local environmental authority. Rill is
              not an emergency service.
            </div>
            <a
              href="https://www.oneaquahealth.eu/citizen-science-project/"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              OneAquaHealth citizen science resources
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="modal-footer">
            <span className="small-muted">Learn a little. Notice a lot.</span>
            <button
              className="button primary"
              onClick={() => {
                setGuide(false);
                if (data.sites.length) setObservation(true);
                else navigate('settings');
              }}
            >
              Make an observation
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ShieldText() {
  return <HelpCircle size={22} />;
}
export default function App() {
  return (
    <Boundary>
      <Application />
    </Boundary>
  );
}
