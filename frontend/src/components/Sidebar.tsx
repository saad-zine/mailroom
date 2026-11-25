import {
  BookOpen,
  CheckSquare,
  Home,
  Inbox,
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
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-wash">
      {/* Logo */}
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="flex cursor-pointer items-center gap-2.5 px-5 pt-5 pb-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 rounded-lg mx-2"
      >
        <img
          src="/automail-icon.png"
          alt="Automail"
          className="h-8 w-8 shrink-0"
        />
        <span className="leading-tight">
          <span className="block text-[15px] font-bold text-ink">Automail</span>
          <span className="block text-[11px] text-muted">AI email copilot</span>
        </span>
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30',
                active
                  ? 'bg-neutral-tint font-medium text-ink'
                  : 'text-body hover:bg-neutral-tint/60',
              )}
            >
              <Icon
                className={cn('h-4 w-4', active ? 'text-ink' : 'text-muted')}
                strokeWidth={1.5}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'queue' && pendingCount > 0 && (
                <span className="rounded-full bg-tint-warning px-2 py-0.5 text-[11px] font-medium text-warning">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-xs leading-relaxed text-faint">
          The inbox that answers itself — with a human in the loop.
        </p>
      </div>
    </aside>
  );
}
