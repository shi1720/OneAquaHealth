import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, Check, LoaderCircle, Waves, ChevronRight } from 'lucide-react';
import type { Assessment, ObservationStatus } from '../shared/types';
import { statusLabels } from './api';
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? 'brand-light' : ''}`}>
      <svg aria-hidden="true" width="36" height="39" viewBox="0 0 80 80">
        <g stroke="currentColor" fill="none" strokeWidth="5.5" strokeLinecap="round">
          <path d="M22 19c29-9 36 5 15 18S19 57 57 49" />
          <path d="M23 36c-6 12 13 16 35 5" />
          <path d="M28 62c12 2 20 0 29-4" />
        </g>
      </svg>
      <span>
        rill<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function Spinner() {
  return <LoaderCircle size={18} className="spin" aria-label="Loading" />;
}
export function PriorityBadge({ priority }: { priority: Assessment['priority'] }) {
  return (
    <span className={`badge priority-${priority}`}>
      <i />
      {priority === 'urgent'
        ? 'Urgent referral'
        : priority === 'high'
          ? 'High priority'
          : priority === 'medium'
            ? 'Follow up'
            : 'Routine'}
    </span>
  );
}
export function StatusBadge({ status }: { status: ObservationStatus | string }) {
  return (
    <span className={`badge status-${status}`}>
      {status === 'resolved' && <Check size={11} />} {statusLabels[status] || status}
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Waves size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  closeDisabled = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  closeDisabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = () => {
    if (!closeDisabled) onClose();
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const focusable = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">RILL WORKSPACE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close dialog"
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function StepLabel({ items, current }: { items: string[]; current: number }) {
  return (
    <div className="steps">
      {items.map((v, i) => (
        <span key={v} className={i === current ? 'current' : i < current ? 'done' : ''}>
          <b>{i < current ? <Check size={12} /> : i + 1}</b>
          {v}
          {i < items.length - 1 && <ChevronRight size={14} />}
        </span>
      ))}
    </div>
  );
}
