import { BookOpenTextIcon } from '@phosphor-icons/react/dist/csr/BookOpenText';
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { TrayIcon } from '@phosphor-icons/react/dist/csr/Tray';
import { cn } from '../lib/utils';
import type { View } from '../App';

const NAV: Array<{ id: View; label: string; icon: typeof HouseIcon }> = [
  { id: 'dashboard', label: 'Home', icon: HouseIcon },
  { id: 'inbox', label: 'Inbox', icon: TrayIcon },
  { id: 'queue', label: 'Approval queue', icon: ClipboardTextIcon },
  { id: 'kb', label: 'Knowledge base', icon: BookOpenTextIcon },
  { id: 'settings', label: 'Settings', icon: GearSixIcon },
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
            'group relative flex cursor-pointer items-center rounded-[10px] font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40',
            mobile
              ? 'min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] sm:text-[10px]'
              : 'w-full gap-3 px-3 py-[9px] text-sm',
            active
              ? 'bg-paper text-ink shadow-sm'
              : 'text-body hover:bg-white/60 hover:text-ink',
          )}
        >
          <Icon
            size={mobile ? 19 : 20}
            weight={active ? 'fill' : 'regular'}
            className={cn('shrink-0', active ? 'text-ink' : 'text-body')}
            aria-hidden="true"
          />
          <span className={cn('min-w-0', mobile ? 'w-full truncate text-center' : 'flex-1 text-left')}>
            {mobile
              ? item.id === 'dashboard'
                ? 'Home'
                : item.id === 'queue'
                  ? 'Queue'
                  : item.id === 'kb'
                    ? 'Docs'
                    : item.label
              : item.label}
          </span>
          {item.id === 'queue' && pendingCount > 0 && !mobile && (
            <span className="rounded-full bg-neutral-tint px-2 py-0.5 text-[11px] font-semibold tabular-nums text-body">
              {pendingCount}
            </span>
          )}
          {item.id === 'queue' && pendingCount > 0 && mobile && (
            <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-teal" aria-hidden="true" />
          )}
        </button>
      );
    });

  return (
    <>
      <aside className="sticky top-[70px] hidden h-[calc(100vh-70px)] w-[280px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-0.5 px-3 pt-3">
          {renderItems()}
        </nav>
      </aside>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-paper/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {renderItems(true)}
      </nav>
    </>
  );
}
