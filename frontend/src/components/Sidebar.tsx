import { BookOpen, Inbox, LayoutDashboard, ListChecks, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
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
}: {
  view: View;
  onNavigate: (view: View) => void;
  pendingCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const activeView = view === 'detail' ? 'inbox' : view;

  return (
    <>
      {open && (
        <div
          className="animate-fade fixed inset-x-0 top-14 bottom-0 z-30 bg-black/55 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-14 bottom-0 left-0 z-40 flex w-[248px] shrink-0 flex-col border-r border-border bg-[#0d0d0d] transition-transform duration-200 ease-out',
          'md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0',
          open ? 'translate-x-0 shadow-pop md:shadow-none' : '-translate-x-full',
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
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
        'flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none',
        active
          ? 'bg-paper font-medium text-ink shadow-xs ring-1 ring-black/[0.04]'
          : 'text-muted hover:bg-white/[0.055] hover:text-ink',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-ink' : 'text-faint')}
        strokeWidth={1.75}
      />
      <span className="flex-1 text-left">{item.label}</span>
      {showCount && (
        <span className="rounded-full bg-tint-warning px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-warning">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
