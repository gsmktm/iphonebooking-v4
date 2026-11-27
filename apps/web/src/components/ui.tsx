import { useEffect, useRef, useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, X, Mountain, Gem, RotateCcw, PackageOpen } from 'lucide-react';
import { ApiError } from '../services/api';

const dialogScrollLocks = new Set<HTMLDialogElement>();
let overflowBeforeDialogs = '';
export function Brand({ diamond = false }: { diamond?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="iPhoneBooking home">
      <span className="brand-mark">
        {diamond ? <Gem size={29} strokeWidth={1.3} /> : <Mountain size={25} strokeWidth={1.5} />}
      </span>
      <span>
        iPhone<span className="brand-light">Booking</span>
        <small>FROM THE HIMALAYAS</small>
      </span>
    </Link>
  );
}
export function ArrowLink({
  to,
  children,
  light = false,
}: {
  to: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <Link to={to} className={`arrow-link ${light ? 'light' : ''}`}>
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? 'secondary' : ''}`} to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
export function ProductVisual({
  image,
  name,
  className = '',
  priority = false,
}: {
  image: string;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  return image.startsWith('/images/') || image.startsWith('/api/v1/media/') ? (
    <img
      src={image}
      alt={name}
      className={`product-visual uploaded-product ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      width={600}
      height={800}
    />
  ) : (
    <div role="img" aria-label={name} className={`product-visual visual-${image} ${className}`} />
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <strong>
        {error instanceof Error
          ? error.message
          : 'We couldn’t load this content. Check your connection and try again.'}
      </strong>
      {error instanceof ApiError && error.requestId && (
        <small>Support reference: {error.requestId}</small>
      )}
      {retry && (
        <button className="text-button" onClick={retry}>
          <RotateCcw size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-grid" aria-label="Loading content" aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function Empty({
  title = 'Nothing here just yet.',
  description,
  link = '/store',
  action = 'Explore the store',
}: {
  title?: string;
  description?: string;
  link?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <PackageOpen size={40} strokeWidth={1} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <ButtonLink to={link}>{action}</ButtonLink>
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  restoreFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  restoreFocusTo?: HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    const trigger =
      restoreFocusTo ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (!dialog.open) dialog.showModal();
    if (!dialogScrollLocks.size) overflowBeforeDialogs = document.body.style.overflow;
    dialogScrollLocks.add(dialog);
    document.body.style.overflow = 'hidden';
    return () => {
      if (dialog.open) dialog.close();
      dialogScrollLocks.delete(dialog);
      if (!dialogScrollLocks.size) document.body.style.overflow = overflowBeforeDialogs;
      queueMicrotask(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, [open, restoreFocusTo]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>
  );
}
