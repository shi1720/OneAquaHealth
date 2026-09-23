import { useState, useEffect } from 'react';
import { Copy, Download, KeyRound, ArrowRight, Check } from 'lucide-react';
import './recovery.css';

export default function RecoveryKey({
  recoveryKey,
  email,
  replacement = false,
  onContinue,
  continueLabel = 'Continue to workspace',
}: {
  recoveryKey: string;
  email: string;
  replacement?: boolean;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const [saved, setSaved] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (saved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setError('');
    } catch {
      setError('Copy is unavailable here. Select the key below or download the text file.');
    }
  }
  function download() {
    const text = `Rill offline account recovery\nAccount email: ${email}\nApplication: ${location.origin}\n\nRecovery key: ${recoveryKey}\n\nKeep this secret in a password manager or a safe offline place. Anyone with this key and the account email can replace the password. A successful recovery consumes this key and issues a replacement. No email is sent. Rill cannot retrieve this key for you.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rill-recovery-key.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return (
    <section className="recovery-key-card" aria-labelledby="recovery-key-title">
      <span className="recovery-key-icon">
        <KeyRound size={23} />
      </span>
      <h2 id="recovery-key-title">
        {replacement ? 'Save your replacement key.' : 'Save your recovery key.'}
      </h2>
      <p>
        This key can restore access if you forget your passphrase. It is shown only now. Store it in
        a password manager or a safe offline place.
      </p>
      {replacement && (
        <p className="recovery-replaced">Any earlier recovery key no longer works.</p>
      )}
      <label>
        Recovery key
        <textarea
          aria-label="Recovery key"
          readOnly
          value={recoveryKey}
          rows={3}
          spellCheck={false}
          autoComplete="off"
          onFocus={(event) => event.target.select()}
        />
      </label>
      <div className="recovery-key-actions">
        <button type="button" className="button secondary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy key'}
        </button>
        <button type="button" className="button secondary" onClick={download}>
          <Download size={16} />
          Download key
        </button>
      </div>
      {copied && (
        <span className="visually-hidden" role="status">
          Recovery key copied.
        </span>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="recovery-key-boundary">
        Anyone with this key and your email can replace your passphrase. No email is sent or
        verified. If you lose both the passphrase and this key, Rill cannot restore access through
        email.
      </p>
      <label className="checkbox-label recovery-key-confirm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
        />
        I have saved this recovery key safely.
      </label>
      <button type="button" className="button primary full" disabled={!saved} onClick={onContinue}>
        {continueLabel}
        <ArrowRight size={17} />
      </button>
    </section>
  );
}
