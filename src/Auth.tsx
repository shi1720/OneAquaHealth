import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, ShieldCheck, MapPin, Leaf, Waves } from 'lucide-react';
import { Logo, Spinner } from './components';
import { client } from './api';
import type { User, RecoveryAuthResult } from '../shared/types';
import RecoveryKey from './RecoveryKey';
export default function Auth({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'recover'>('welcome');
  const [recovery, setRecovery] = useState<RecoveryAuthResult | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function demo() {
    setBusy('demo');
    setError('');
    try {
      onLogin((await client.demo()).user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy('form');
    setError('');
    try {
      if (mode === 'register') {
        setRecovery(
          await client.register(
            String(f.get('name')),
            String(f.get('email')),
            String(f.get('password')),
            String(f.get('workspace')),
          ),
        );
      } else if (mode === 'recover') {
        if (f.get('password') !== f.get('repeatPassword'))
          throw new Error('The new passphrases do not match.');
        setRecovery(
          await client.recover(
            String(f.get('email')),
            String(f.get('recoveryKey')),
            String(f.get('password')),
          ),
        );
      } else onLogin((await client.login(String(f.get('email')), String(f.get('password')))).user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo light />
        <div className="auth-story-main">
          <span className="eyebrow">SMALL STREAMS. SHARED FUTURES.</span>
          <h1>
            Every observation.
            <br />A better
            <br />
            <em>next step.</em>
          </h1>
          <p>
            Connect what your community sees with what your stream needs. Plan the next visit.
            Follow through. See what changed.
          </p>
          <div className="auth-principles">
            <span>
              <Leaf size={17} /> Healthier ecosystems
            </span>
            <span>
              <Waves size={17} /> Stronger communities
            </span>
          </div>
        </div>
        <svg className="auth-river" viewBox="0 0 600 250" fill="none" aria-hidden="true">
          <path
            d="M-20 230C131 62 182 235 315 128S450 144 639 0"
            stroke="#719a75"
            strokeWidth="1"
          />
          <path
            d="M-20 246C131 78 182 251 315 144S450 160 639 16"
            stroke="#719a75"
            strokeWidth="1"
          />
          <path
            d="M-20 262C131 94 182 267 315 160S450 176 639 32"
            stroke="#a9c983"
            strokeWidth="6"
          />
          <path
            d="M-20 278C131 110 182 283 315 176S450 192 639 48"
            stroke="#719a75"
            strokeWidth="1"
          />
          <path
            d="M-20 294C131 126 182 299 315 192S450 208 639 64"
            stroke="#719a75"
            strokeWidth="1"
          />
        </svg>
        <div className="auth-credit">
          Built by Shivam Gupta <span>OneAquaHealth IEEE Hackathon 2026</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-top">
          <span>Made for stream stewards</span>
          <ShieldCheck size={18} />
        </div>
        <div className="auth-content">
          {recovery ? (
            <RecoveryKey
              recoveryKey={recovery.recoveryKey}
              email={recovery.user.email}
              replacement={mode === 'recover'}
              onContinue={() => {
                const user = recovery.user;
                setRecovery(null);
                onLogin(user);
              }}
            />
          ) : (
            <>
              <span className="mini-label">
                <i /> EVERY STREAM COUNTS
              </span>
              <h2>
                {mode === 'register'
                  ? 'A home for your catchment.'
                  : mode === 'recover'
                    ? 'Restore your account.'
                    : mode === 'login'
                      ? 'Welcome back.'
                      : 'Good observations deserve follow-through.'}
              </h2>
              <p className="auth-description">
                {mode === 'register'
                  ? 'Create a workspace for your river team. Add your own monitoring sites and start with a clean slate.'
                  : mode === 'recover'
                    ? 'Use the offline recovery key you saved. Your passphrase and recovery key will be replaced, and previous sessions will be signed out.'
                    : mode === 'login'
                      ? 'Sign in to your team’s workspace to pick up where you left off.'
                      : 'Meet your team’s workspace for turning citizen reports into informed, accountable action.'}
              </p>
              {mode === 'welcome' ? (
                <>
                  <button className="button primary auth-demo" disabled={!!busy} onClick={demo}>
                    {busy === 'demo' ? (
                      <Spinner />
                    ) : (
                      <>
                        Explore the live demo <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <p className="demo-small">
                    No account needed. Your own private sample workspace.
                  </p>
                  <div className="demo-preview">
                    <div className="demo-preview-icon">
                      <MapPin size={21} />
                    </div>
                    <div>
                      <b>A morning in Coimbra</b>
                      <p>
                        Six sites. A few uncertain reports.
                        <br />
                        Two hours to make a difference.
                      </p>
                    </div>
                    <span className="tiny-tag">SAMPLE SCENARIO</span>
                  </div>
                  <div className="auth-divider">
                    <span>or bring your own catchment</span>
                  </div>
                  <button className="button secondary full" onClick={() => setMode('register')}>
                    Create a workspace <ArrowRight size={16} />
                  </button>
                  <p className="auth-switch">
                    Already part of a team?{' '}
                    <button onClick={() => setMode('login')}>Sign in</button>
                  </p>
                </>
              ) : (
                <form key={mode} onSubmit={submit} className="auth-form">
                  {mode === 'register' && (
                    <>
                      <label>
                        Your name
                        <input
                          required
                          name="name"
                          autoComplete="name"
                          placeholder="Shivam Gupta"
                          maxLength={80}
                        />
                      </label>
                      <label>
                        Workspace name
                        <input
                          required
                          name="workspace"
                          placeholder="Our river team"
                          maxLength={100}
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Email address
                    <input
                      required
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourteam.org"
                      maxLength={254}
                    />
                  </label>
                  {mode === 'recover' && (
                    <label>
                      Recovery key
                      <input
                        required
                        name="recoveryKey"
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={160}
                        placeholder="Your saved RILL-… key"
                      />
                    </label>
                  )}
                  <label>
                    {mode === 'recover' ? 'New passphrase' : 'Password'}
                    <input
                      required
                      name="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Your password' : 'At least 12 characters'}
                      minLength={mode === 'login' ? 1 : 12}
                      maxLength={128}
                    />
                  </label>
                  {mode === 'recover' && (
                    <>
                      <label>
                        Repeat new passphrase
                        <input
                          required
                          name="repeatPassword"
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={128}
                        />
                      </label>
                      <p className="form-hint auth-recovery-hint">
                        No email is sent. A recovery key proves possession of an account secret, not
                        a verified identity. If you have lost both your passphrase and key, this
                        recovery route cannot restore access.
                      </p>
                    </>
                  )}
                  {mode === 'login' && (
                    <p className="auth-recovery-link">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('recover');
                          setError('');
                        }}
                      >
                        Forgot your passphrase?
                      </button>
                    </p>
                  )}
                  {mode === 'register' && (
                    <p className="form-hint">
                      Use a unique passphrase. Next, save your private offline recovery key. No
                      email verification or recovery message is sent.
                    </p>
                  )}
                  <button className="button primary full" disabled={!!busy}>
                    {busy === 'form' ? (
                      <Spinner />
                    ) : mode === 'recover' ? (
                      'Restore account'
                    ) : mode === 'register' ? (
                      'Create workspace'
                    ) : (
                      'Sign in'
                    )}
                    <ArrowRight size={17} />
                  </button>
                  <p className="auth-switch">
                    {mode === 'recover'
                      ? 'Remember your passphrase?'
                      : mode === 'register'
                        ? 'Already registered?'
                        : 'New to Rill?'}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'register' || mode === 'recover' ? 'login' : 'register');
                        setError('');
                      }}
                    >
                      {mode === 'register' || mode === 'recover' ? 'Sign in' : 'Create a workspace'}
                    </button>
                  </p>
                  <button
                    type="button"
                    className="button ghost full"
                    onClick={() => {
                      setMode('welcome');
                      setError('');
                    }}
                  >
                    Back to demo
                  </button>
                </form>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="auth-trust">
                <Check size={14} /> No paid API or model key required <span>·</span> Human judgment
                stays in charge
              </div>
            </>
          )}
        </div>
        <footer className="auth-footer">
          A fieldwork companion for the One Health community.
          <a href="https://github.com/shi1720/OneAquaHealth" target="_blank" rel="noreferrer">
            Explore the source ↗
          </a>
        </footer>
      </section>
    </div>
  );
}
