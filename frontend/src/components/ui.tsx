import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { cn, initials } from '../lib/utils';
import type { Category, DraftStatus } from '../lib/api';

/* ---------- Button ---------- */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border border-black/10 bg-ink text-white shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-black active:translate-y-px focus-visible:ring-ink/25',
  secondary:
    'border border-border bg-paper text-ink shadow-xs hover:border-border-strong hover:bg-wash active:translate-y-px focus-visible:ring-teal/25',
  ghost:
    'border border-transparent bg-transparent text-muted hover:bg-black/[0.045] hover:text-ink focus-visible:ring-teal/25',
  destructive:
    'border border-error/15 bg-paper text-error shadow-xs hover:border-error/25 hover:bg-tint-error focus-visible:ring-error/20',
  danger:
    'border border-[#a83226] bg-[#c0392b] text-white shadow-[0_1px_2px_rgba(0,0,0,0.16)] hover:bg-[#a83226] active:translate-y-px focus-visible:ring-error/25',
  accent:
    'border border-teal-deep/30 bg-teal text-white shadow-[0_1px_2px_rgba(15,122,109,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-teal-deep active:translate-y-px focus-visible:ring-teal/25',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[12.5px]',
  md: 'h-9 gap-1.5 px-3.5 text-[13px]',
  lg: 'h-10 gap-2 px-4 text-[13.5px]',
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
        'inline-flex cursor-pointer items-center justify-center rounded-[10px] font-medium whitespace-nowrap',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */

type BadgeTone = 'teal' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const badgeTones: Record<BadgeTone, string> = {
  teal: 'bg-tint-teal text-teal ring-teal/10',
  success: 'bg-tint-success text-success ring-success/10',
  warning: 'bg-tint-warning text-warning ring-warning/10',
  error: 'bg-tint-error text-error ring-error/10',
  info: 'bg-tint-info text-info ring-info/10',
  neutral: 'bg-neutral-tint text-[#5b6068] ring-black/[0.03]',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] leading-4 font-medium whitespace-nowrap ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
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

export function CategoryBadge({
  category,
  dot = true,
}: {
  category: Category;
  dot?: boolean;
}) {
  const meta = CATEGORY_META[category] ?? { label: category, tone: 'neutral' as BadgeTone };
  return (
    <Badge tone={meta.tone} dot={dot}>
      {meta.label}
    </Badge>
  );
}

const DRAFT_STATUS_META: Record<DraftStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  sent: { label: 'Sent', tone: 'teal' },
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const meta = DRAFT_STATUS_META[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

/* ---------- Surfaces ---------- */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-paper shadow-card', className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Controls ---------- */

export function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium whitespace-nowrap transition-all duration-150',
        'focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas focus-visible:outline-none',
        active
          ? 'border-ink bg-ink text-white shadow-xs'
          : 'border-border bg-paper text-body hover:border-border-strong hover:bg-wash',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'text-[10.5px] tabular-nums',
            active ? 'text-white/55' : 'text-faint',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[10px] border border-border bg-neutral-tint/70 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-medium transition-all duration-150',
              'focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none',
              active
                ? 'bg-paper text-ink shadow-xs ring-1 ring-black/[0.04]'
                : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'text-[10.5px] tabular-nums',
                  active ? 'text-faint' : 'text-faint/80',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Avatar ---------- */

const AVATAR_GRADIENTS = [
  'from-[#0f766e] to-[#0b5d55]',
  'from-[#475569] to-[#334155]',
  'from-[#7c3aed] to-[#5b21b6]',
  'from-[#b45309] to-[#92400e]',
  'from-[#be123c] to-[#9f1239]',
  'from-[#1d4ed8] to-[#1e40af]',
  'from-[#0e7490] to-[#155e75]',
  'from-[#4d7c0f] to-[#3f6212]',
];

const AVATAR_SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10.5px]',
  md: 'h-9 w-9 text-[11px]',
  lg: 'h-10 w-10 text-[11.5px]',
  xl: 'h-12 w-12 text-[13px]',
};

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold tracking-wide text-white ring-1 ring-black/5 select-none',
        AVATAR_SIZES[size],
        avatarGradient(name),
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Icon tile ---------- */

type IconTone = 'teal' | 'amber' | 'blue' | 'rose' | 'green' | 'neutral' | 'ink';

const iconTones: Record<IconTone, string> = {
  teal: 'bg-tint-teal text-teal ring-teal/10',
  amber: 'bg-tint-warning text-warning ring-warning/10',
  blue: 'bg-tint-info text-info ring-info/10',
  rose: 'bg-tint-error text-error ring-error/10',
  green: 'bg-tint-success text-success ring-success/10',
  neutral: 'bg-neutral-tint text-muted ring-black/[0.03]',
  ink: 'bg-ink text-white ring-white/10',
};

const iconSizes = {
  sm: 'h-7 w-7 rounded-[8px]',
  md: 'h-9 w-9 rounded-[10px]',
  lg: 'h-10 w-10 rounded-xl',
};

export function IconTile({
  tone = 'neutral',
  size = 'md',
  children,
  className,
}: {
  tone?: IconTone;
  size?: keyof typeof iconSizes;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center ring-1 ring-inset',
        iconTones[tone],
        iconSizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Keyboard hint ---------- */

export function Kbd({
  children,
  tone = 'light',
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border px-1 font-sans text-[10px] font-medium',
        tone === 'dark'
          ? 'border-white/15 bg-white/10 text-white/60'
          : 'border-border bg-wash text-faint',
      )}
    >
      {children}
    </kbd>
  );
}

/* ---------- Loading / empty / error ---------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-5 w-5 animate-spin text-teal', className)}
      strokeWidth={2}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tint-teal ring-1 ring-teal/10 ring-inset">
        <Spinner className="h-4 w-4" />
      </span>
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}

type EmptyArtVariant = 'inbox' | 'queue' | 'docs' | 'search' | 'mail';

export function EmptyArt({ variant = 'inbox' }: { variant?: EmptyArtVariant }) {
  const id = `mr-art-${variant}`;
  return (
    <svg
      viewBox="0 0 160 120"
      className="h-[104px] w-[139px]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#eef8f5" />
          <stop offset="1" stopColor="#fbfbf9" />
        </linearGradient>
        <linearGradient id={`${id}-teal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#149b8b" />
          <stop offset="1" stopColor="#0a5d53" />
        </linearGradient>
      </defs>

      <rect x="18" y="8" width="124" height="104" rx="30" fill={`url(#${id}-bg)`} />
      <circle cx="122" cy="30" r="3" fill="#cfe9e3" />
      <circle cx="36" cy="86" r="2" fill="#dbe4e1" />
      <path
        d="M126 68h7M129.5 64.5v7"
        stroke="#c8ded8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {variant === 'inbox' && (
        <g>
          <rect x="58" y="30" width="46" height="34" rx="5" fill="#fff" stroke="#d8d8d1" strokeWidth="1.5" />
          <path d="M64 41h22M64 47h30M64 53h16" stroke="#dfe3e2" strokeWidth="2" strokeLinecap="round" />
          <rect x="46" y="46" width="70" height="42" rx="8" fill="#fff" stroke="#cfd4d1" strokeWidth="1.6" />
          <path d="M48 50l33 22 33-22" stroke="#c3cac7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="112" cy="82" r="13" fill={`url(#${id}-teal)`} />
          <path d="M106.5 82.2l3.6 3.6 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {variant === 'queue' && (
        <g>
          <rect x="50" y="36" width="62" height="40" rx="8" fill="#fff" stroke="#d8d8d1" strokeWidth="1.5" transform="rotate(-6 81 56)" />
          <rect x="46" y="44" width="66" height="42" rx="8" fill="#fff" stroke="#cfd4d1" strokeWidth="1.6" />
          <path d="M58 58h26M58 65h38M58 72h20" stroke="#e0e3e2" strokeWidth="2" strokeLinecap="round" />
          <circle cx="113" cy="80" r="13" fill={`url(#${id}-teal)`} />
          <path d="M107.5 80.2l3.6 3.6 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M60 30h9M64.5 25.5v9" stroke="#c8ded8" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}

      {variant === 'docs' && (
        <g>
          <rect x="58" y="30" width="42" height="52" rx="6" fill="#fff" stroke="#d8d8d1" strokeWidth="1.5" transform="rotate(-8 79 56)" />
          <rect x="52" y="36" width="46" height="54" rx="6" fill="#fff" stroke="#cfd4d1" strokeWidth="1.6" />
          <path d="M63 50h24M63 58h24M63 66h15" stroke="#e0e3e2" strokeWidth="2" strokeLinecap="round" />
          <path d="M92 36v12h12" stroke="#c8d0cd" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="112" cy="82" r="13" fill={`url(#${id}-teal)`} />
          <path d="M108 78h8M108 82h8M108 86h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {variant === 'search' && (
        <g>
          <rect x="42" y="44" width="58" height="38" rx="8" fill="#fff" stroke="#cfd4d1" strokeWidth="1.6" />
          <path d="M44 48l27 18 27-18" stroke="#c3cac7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="102" cy="72" r="15" fill="#fff" stroke={`url(#${id}-teal)`} strokeWidth="2.4" />
          <path d="M113 83l8 8" stroke={`url(#${id}-teal)`} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {variant === 'mail' && (
        <g>
          <rect x="44" y="40" width="72" height="46" rx="9" fill="#fff" stroke="#cfd4d1" strokeWidth="1.6" />
          <path d="M46 45l34 23 34-23" stroke="#c3cac7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M126 38l3.2 6.8L136 48l-6.8 3.2L126 58l-3.2-6.8L116 48l6.8-3.2L126 38z" fill="#bfe3da" />
          <circle cx="52" cy="34" r="2.5" fill="#cfe9e3" />
        </g>
      )}
    </svg>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
  art = 'inbox',
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  art?: EmptyArtVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      <EmptyArt variant={art} />
      <p className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {subtitle && (
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">{subtitle}</p>
      )}
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
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint-error ring-1 ring-error/10 ring-inset">
        <AlertCircle className="h-5 w-5 text-error" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-[14px] font-semibold text-ink">Something went wrong</p>
      <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">{message}</p>
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
      className="animate-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/35 p-4 pt-[10vh] backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-pop w-full max-w-md overflow-hidden rounded-2xl border border-border bg-paper shadow-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-neutral-tint hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
