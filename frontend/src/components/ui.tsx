import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { TrayIcon } from '@phosphor-icons/react/dist/csr/Tray';
import { cn } from '../lib/utils';
import type { Category, DraftStatus } from '../lib/api';

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-paper border border-ink hover:opacity-90 focus-visible:ring-ink/20',
  secondary:
    'bg-paper text-ink border border-border hover:border-border-strong hover:bg-wash focus-visible:ring-teal/20',
  ghost:
    'bg-transparent text-muted border border-transparent hover:bg-wash hover:text-ink focus-visible:ring-teal/20',
  destructive:
    'bg-error text-error-foreground border border-error hover:brightness-95 focus-visible:ring-error/20',
  accent:
    'bg-teal text-teal-foreground border border-teal hover:brightness-95 focus-visible:ring-teal/20',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] h-8 gap-1.5',
  md: 'px-4 py-2 text-sm h-9 gap-2',
  lg: 'px-5 py-2.5 text-[15px] h-11 gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-lg font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-wash disabled:text-faint',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <SpinnerGapIcon size={16} weight="regular" className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */

type BadgeTone = 'teal' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const badgeTones: Record<BadgeTone, string> = {
  teal: 'bg-tint-teal text-teal',
  success: 'bg-tint-success text-success',
  warning: 'bg-tint-warning text-warning',
  error: 'bg-tint-error text-error',
  info: 'bg-tint-info text-info',
  neutral: 'bg-neutral-tint text-body',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const CATEGORY_META: Record<Category, { label: string; tone: BadgeTone }> = {
  product_enquiry: { label: 'Product enquiry', tone: 'teal' },
  customer_complaint: { label: 'Complaint', tone: 'error' },
  customer_feedback: { label: 'Feedback', tone: 'info' },
  unrelated: { label: 'Unrelated', tone: 'neutral' },
};

export function CategoryBadge({ category }: { category: Category }) {
  const meta = CATEGORY_META[category] ?? { label: category, tone: 'neutral' as BadgeTone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const DRAFT_STATUS_META: Record<DraftStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  sent: { label: 'Sent', tone: 'teal' },
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const meta = DRAFT_STATUS_META[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/* ---------- Card / section ---------- */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-border bg-paper shadow-none transition-colors duration-200', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Filter chip ---------- */

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30',
        active
          ? 'border-teal bg-tint-teal text-teal'
          : 'border-border bg-paper text-body hover:border-border-strong hover:bg-wash',
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Loading / empty / error ---------- */

export function Spinner({ className }: { className?: string }) {
  return <SpinnerGapIcon size={20} weight="regular" className={cn('animate-spin text-muted', className)} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
      <Spinner />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-wash text-muted">
        <TrayIcon size={20} weight="regular" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-error">Something went wrong</p>
      <p className="mt-1 max-w-md text-[13px] text-muted">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-paper p-6 shadow-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
