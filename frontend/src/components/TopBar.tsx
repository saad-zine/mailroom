import {
  BookOpen,
  CheckSquare,
  FlaskConical,
  Home,
  Inbox,
  Mail,
  Moon,
  Settings,
  Sun,
  TriangleAlert,
} from 'lucide-react';
import type { Health } from '../lib/api';
import type { View } from '../App';
import { Badge } from './ui';

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  queue: 'Approval queue',
  kb: 'Knowledge base',
  settings: 'Settings',
  detail: 'Email review',
};

const VIEW_ICONS: Record<View, typeof Home> = {
  dashboard: Home,
  inbox: Inbox,
  queue: CheckSquare,
  kb: BookOpen,
  settings: Settings,
  detail: Mail,
};

export function TopBar({
  view,
  health,
  apiReachable,
  theme,
  onToggleTheme,
}: {
  view: View;
  health: Health | null;
  apiReachable: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const PageIcon = VIEW_ICONS[view];

  return (
    <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-paper/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3" aria-label="Breadcrumb">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wash text-muted lg:hidden">
          <Mail className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="hidden items-center gap-2 text-xs font-medium text-muted lg:flex">
          Workspace <span className="text-faint">/</span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tint-teal text-teal">
          <PageIcon className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="truncate text-sm font-semibold tracking-[-0.02em] text-ink">{VIEW_TITLES[view]}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {!apiReachable ? (
          <Badge tone="error"><span className="size-1.5 rounded-full bg-error" aria-hidden="true" /><span className="sr-only sm:not-sr-only">API unreachable</span></Badge>
        ) : health ? (
          health.mode === 'mock' ? (
            <Badge tone="warning"><FlaskConical className="size-3.5" strokeWidth={1.8} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Demo mode</span></Badge>
          ) : health.llm_available === false ? (
            <Badge tone="warning"><span className="size-1.5 rounded-full bg-warning" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Setup needed</span></Badge>
          ) : (
            <Badge tone="success"><span className="size-1.5 rounded-full bg-success" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Live · {health.provider}</span></Badge>
          )
        ) : null}
        <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-paper text-muted transition-colors hover:bg-wash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
        >
          {theme === 'dark' ? <Sun className="size-[17px]" strokeWidth={1.8} aria-hidden="true" /> : <Moon className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

export function SetupBanner({ health }: { health: Health | null }) {
  if (!health || health.mode !== 'live' || !health.setup_hint) return null;
  return (
    <div role="status" className="flex items-start gap-3 border-b border-border bg-paper/60 px-4 py-2 text-muted sm:px-6 lg:px-8">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.8} aria-hidden="true" />
      <p className="text-xs leading-relaxed sm:text-[12px]">
        <span className="font-semibold text-warning">Setup needed</span><span className="mx-1.5 text-faint">·</span>{health.setup_hint}
      </p>
    </div>
  );
}

export function DemoBanner({ health }: { health: Health | null }) {
  if (!health || health.mode !== 'mock') return null;
  return (
    <div role="status" className="flex items-start gap-3 border-b border-border bg-paper/60 px-4 py-2 text-muted sm:px-6 lg:px-8">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.8} aria-hidden="true" />
      <p className="text-xs leading-relaxed sm:text-[12px]">
        <span className="font-semibold text-warning">Demo data</span><span className="mx-1.5 text-faint">·</span>No real Gmail connected. Connect Gmail in Settings to process your real inbox.
      </p>
    </div>
  );
}
