import type { ReactNode } from 'react';
import {
  ArrowRight,
  Bell,
  FlaskConical,
  Mail,
  Menu,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { Health } from '../lib/api';
import type { View } from '../App';
import { Kbd } from './ui';
import { cn } from '../lib/utils';

export function TopBar({
  health,
  apiReachable,
  pendingCount,
  onOpenSearch,
  onNavigate,
  onOpenMobileNav,
}: {
  health: Health | null;
  apiReachable: boolean;
  pendingCount: number;
  onOpenSearch: () => void;
  onNavigate: (view: View) => void;
  onOpenMobileNav: () => void;
}) {
  const status = !apiReachable
    ? {
        label: 'Offline',
        dot: 'bg-red-400',
        className: 'bg-red-400/10 text-red-200 ring-red-400/20',
        title: 'The Mailroom API is unreachable.',
      }
    : health?.mode === 'mock'
      ? {
          label: 'Demo mode',
          dot: 'bg-amber-300',
          className: 'bg-amber-300/10 text-amber-100 ring-amber-300/20',
          title: 'Running on sample data — connect Gmail in Settings.',
        }
      : health?.llm_available === false
        ? {
            label: 'Setup needed',
            dot: 'bg-amber-300',
            className: 'bg-amber-300/10 text-amber-100 ring-amber-300/20',
            title: 'The language model is not configured yet.',
          }
        : {
            label: 'Live',
            dot: 'bg-emerald-400',
            className: 'bg-emerald-400/10 text-emerald-100 ring-emerald-400/20',
            title: health ? `Connected via ${health.provider}` : 'Connected',
          };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-black/50 bg-[#151515] px-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:gap-3 sm:px-4 lg:px-5">
      {/* Mobile nav */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none md:hidden"
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={1.75} />
      </button>

      {/* Brand */}
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        aria-label="Mailroom home"
      >
        <img
          src="/mailroom-icon-white.png"
          alt=""
          className="h-[26px] w-[26px] shrink-0"
        />
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
            Mailroom
          </span>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-2 py-[1px] text-[10px] font-medium tracking-wide text-white/55 sm:inline">
            AI inbox
          </span>
        </span>
      </button>

      {/* Search */}
      <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex h-9 w-full max-w-[540px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.055] px-3 text-left transition-all duration-150 hover:border-white/20 hover:bg-white/[0.085] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <Search className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.75} />
          <span className="hidden flex-1 truncate text-[12.5px] text-white/45 sm:block">
            Search mail, drafts, and pages…
          </span>
          <span className="flex flex-1 items-center text-[12.5px] text-white/45 sm:hidden">
            Search
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd tone="dark">⌘</Kbd>
            <Kbd tone="dark">K</Kbd>
          </span>
        </button>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title={
            health?.mode === 'mock'
              ? 'Demo mode — Gmail is not connected. Open Settings to learn how to connect it.'
              : health?.gmail_connected
                ? 'Gmail connected — open Settings for connection details.'
                : 'Gmail not connected — open Settings to connect an account.'
          }
          className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none md:inline-flex"
        >
          <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              health?.mode === 'mock'
                ? 'bg-amber-300'
                : health?.gmail_connected
                  ? 'bg-emerald-400'
                  : 'bg-white/30',
            )}
          />
          <span className="hidden lg:inline">Gmail</span>
        </button>

        <span
          title={status.title}
          className={cn(
            'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset md:inline-flex',
            status.className,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
          {status.label}
        </span>

        <button
          type="button"
          onClick={() => onNavigate('queue')}
          aria-label={
            pendingCount > 0
              ? `${pendingCount} drafts waiting for review`
              : 'Approval queue'
          }
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal px-1 text-[9px] font-semibold text-white ring-2 ring-[#151515]">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title="Workspace settings"
          className="flex cursor-pointer items-center gap-2 rounded-full py-0.5 pr-1 pl-0.5 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#149b8b] to-[#0a5d53] text-[10.5px] font-semibold text-white ring-1 ring-white/20">
            MR
          </span>
          <span className="hidden pr-1 text-[12px] font-medium text-white/75 lg:block">
            Support
          </span>
        </button>
      </div>
    </header>
  );
}

/* ---------- Banners ---------- */

function NoticeBanner({
  tone,
  icon,
  title,
  children,
  action,
  onDismiss,
}: {
  tone: 'warning' | 'error';
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xs',
        tone === 'warning'
          ? 'border-warning/15 bg-tint-warning'
          : 'border-error/15 bg-tint-error',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
          tone === 'warning'
            ? 'bg-white/70 text-warning ring-warning/10'
            : 'bg-white/70 text-error ring-error/10',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-relaxed text-body">
          <span className="font-semibold text-ink">{title}</span>
          {' — '}
          {children}
        </p>
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-black/[0.05] hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

export function DemoBanner({
  health,
  onGoSettings,
  onDismiss,
}: {
  health: Health | null;
  onGoSettings: () => void;
  onDismiss?: () => void;
}) {
  if (!health || health.mode !== 'mock') return null;
  return (
    <NoticeBanner
      tone="warning"
      icon={<FlaskConical className="h-4 w-4" strokeWidth={1.75} />}
      title="Demo data"
      action={
        <button
          type="button"
          onClick={onGoSettings}
          className="mt-0.5 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-warning transition-colors hover:bg-warning/10 focus-visible:ring-2 focus-visible:ring-warning/25 focus-visible:outline-none"
        >
          Connect Gmail
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      }
      onDismiss={onDismiss}
    >
      no real Gmail account is connected, so the inbox, drafts, and stats are sample
      data.
    </NoticeBanner>
  );
}

export function SetupBanner({
  health,
  onDismiss,
}: {
  health: Health | null;
  onDismiss?: () => void;
}) {
  if (!health || health.mode !== 'live' || !health.setup_hint) return null;
  return (
    <NoticeBanner
      tone="warning"
      icon={<TriangleAlert className="h-4 w-4" strokeWidth={1.75} />}
      title="Setup needed"
      onDismiss={onDismiss}
    >
      {health.setup_hint}
    </NoticeBanner>
  );
}
