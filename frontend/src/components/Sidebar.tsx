import {
  BookOpen,
  CheckSquare,
  Home,
  Inbox,
  Mail,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { View } from '../App';

const NAV: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'queue', label: 'Approval queue', icon: CheckSquare },
  { id: 'kb', label: 'Knowledge base', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  view,
  onNavigate,
  pendingCount,
}: {
  view: View;
  onNavigate: (view: View) => void;
  pendingCount: number;
}) {
  const renderItems = (mobile = false) =>
    NAV.map((item) => {
      const Icon = item.icon;
      const active = view === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group flex cursor-pointer items-center rounded-xl font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40',
            mobile
              ? 'min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] sm:text-[10px]'
              : 'w-full gap-3 px-3 py-2.5 text-[13px]',
            active
              ? 'bg-tint-teal text-teal'
              : 'text-muted hover:bg-neutral-tint/70 hover:text-ink',
          )}
        >
          <span
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-lg transition-colors',
              mobile ? 'size-7' : 'size-8',
              active ? 'bg-paper text-teal shadow-sm' : 'text-muted group-hover:text-ink',
            )}
          >
            <Icon className={mobile ? 'size-[17px]' : 'size-[18px]'} strokeWidth={1.8} aria-hidden="true" />
            {item.id === 'queue' && pendingCount > 0 && mobile && (
              <span className="absolute right-0 top-0 size-2 rounded-full border-2 border-paper bg-warning" />
            )}
          </span>
          {!mobile && <span className="min-w-0 flex-1 text-left">{item.label}</span>}
          {item.id === 'queue' && pendingCount > 0 && !mobile && (
            <span className="rounded-full bg-tint-warning px-2 py-0.5 text-[11px] font-semibold tabular-nums text-warning">
              {pendingCount}
            </span>
          )}
          {mobile && (
            <span className="w-full min-w-0 truncate text-center">
              {item.id === 'dashboard' ? 'Home' : item.id === 'queue' ? 'Queue' : item.id === 'kb' ? 'Docs' : item.label}
            </span>
          )}
        </button>
      );
    });

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-paper lg:flex">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="mx-4 mt-5 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
          aria-label="Mailroom home"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal text-teal-foreground shadow-sm">
            <Mail className="size-[19px]" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[16px] font-bold tracking-[-0.04em] text-ink">Mailroom</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Support operations
            </span>
          </span>
        </button>

        <div className="mx-5 mt-8 mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
          Workspace
        </div>
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3">
          {renderItems()}
        </nav>

        <div className="mx-5 mb-5 border-t border-border pt-4">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-ink">
            <span className="size-1.5 rounded-full bg-teal" aria-hidden="true" />
            Human review required
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Replies remain drafts until you approve them.
          </p>
        </div>
      </aside>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-paper/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(16,24,40,0.06)] backdrop-blur lg:hidden"
      >
        {renderItems(true)}
      </nav>
    </>
  );
}
