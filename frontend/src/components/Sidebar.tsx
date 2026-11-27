import {
  BookOpen,
  ChevronsUpDown,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Health } from '../lib/api';
import type { View } from '../App';

const NAV_MAIN: Array<{ id: View; label: string; icon: typeof Inbox }> = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'queue', label: 'Approval queue', icon: ListChecks },
  { id: 'kb', label: 'Knowledge base', icon: BookOpen },
];

const NAV_ACCOUNT: Array<{ id: View; label: string; icon: typeof Inbox }> = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  view,
  onNavigate,
  pendingCount,
  open,
  onClose,
  health,
  apiReachable,
}: {
  view: View;
  onNavigate: (view: View) => void;
  pendingCount: number;
  open: boolean;
  onClose: () => void;
  health: Health | null;
  apiReachable: boolean;
}) {
  const activeView = view === 'detail' ? 'inbox' : view;
  const systemStatus = !apiReachable
    ? { label: 'API offline', dot: 'bg-red-500' }
    : health?.mode === 'mock'
      ? { label: 'Demo systems', dot: 'bg-amber-400' }
      : health?.llm_available === false
        ? { label: 'Setup needed', dot: 'bg-amber-400' }
        : { label: 'All systems normal', dot: 'bg-emerald-500' };

  return (
    <>
      {open && (
        <div
          className="animate-fade fixed inset-x-0 top-14 bottom-0 z-30 bg-ink/30 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-14 bottom-0 left-0 z-40 flex w-[248px] shrink-0 flex-col border-r border-border bg-[#fbfbf9] transition-transform duration-200 ease-out',
          'md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0',
          open ? 'translate-x-0 shadow-pop md:shadow-none' : '-translate-x-full',
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Workspace */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="group mb-5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-paper p-2.5 text-left shadow-xs transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-ink to-[#34373e] text-white ring-1 ring-black/10">
              <Mail className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">
                Support inbox
              </span>
              <span className="block text-[10.5px] text-faint">Mailroom workspace</span>
            </span>
            <ChevronsUpDown
              className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-muted"
              strokeWidth={1.75}
            />
          </button>

          <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">
            Workspace
          </p>
          <nav className="space-y-0.5">
            {NAV_MAIN.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeView === item.id}
                pendingCount={pendingCount}
                onNavigate={onNavigate}
              />
            ))}
          </nav>

          <p className="mt-6 mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">
            Account
          </p>
          <nav className="space-y-0.5">
            {NAV_ACCOUNT.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeView === item.id}
                pendingCount={pendingCount}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 p-3">
          <div className="relative overflow-hidden rounded-xl border border-teal/15 bg-gradient-to-br from-tint-teal to-white p-3.5">
            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-teal/10 blur-xl" />
            <div className="relative flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal/10 text-teal ring-1 ring-teal/10 ring-inset">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <p className="text-[11.5px] font-semibold text-ink">Human in the loop</p>
            </div>
            <p className="relative mt-1.5 text-[11px] leading-relaxed text-muted">
              Every AI reply waits for your approval before it leaves the mailroom.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 px-1">
            <span
              className={cn('live-dot h-1.5 w-1.5 rounded-full', systemStatus.dot)}
            />
            <span className="text-[10.5px] text-faint">{systemStatus.label}</span>
            <span className="ml-auto text-[10.5px] text-faint/80">Beta</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  active,
  pendingCount,
  onNavigate,
}: {
  item: { id: View; label: string; icon: typeof Inbox };
  active: boolean;
  pendingCount: number;
  onNavigate: (view: View) => void;
}) {
  const Icon = item.icon;
  const showCount = item.id === 'queue' && pendingCount > 0;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-all duration-150',
        'focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none',
        active
          ? 'bg-paper font-medium text-ink shadow-[0_1px_2px_rgba(20,23,28,0.06)] ring-1 ring-black/[0.04]'
          : 'text-[#5f646b] hover:bg-black/[0.035] hover:text-ink',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-ink' : 'text-faint group-hover:text-muted',
        )}
        strokeWidth={1.75}
      />
      <span className="flex-1 text-left">{item.label}</span>
      {showCount && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
            active
              ? 'bg-tint-warning text-warning'
              : 'bg-warning/10 text-warning',
          )}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );
}
