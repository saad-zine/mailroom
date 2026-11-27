import { Bell, Menu, Search } from 'lucide-react';
import type { View } from '../App';
import { BrandMark } from '../landing/BrandMark';
import { Kbd } from './ui';

/** One dark command bar: brand, working search, real queue count, account menu.
 *  No fake status pills, no marketing tags. */
export function TopBar({
  pendingCount,
  onOpenSearch,
  onNavigate,
  onOpenMobileNav,
}: {
  pendingCount: number;
  onOpenSearch: () => void;
  onNavigate: (view: View) => void;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-black/50 bg-[#151515] px-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:gap-3 sm:px-4 lg:px-5">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none md:hidden"
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={1.75} />
      </button>

      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        aria-label="Mailroom home"
      >
        <BrandMark size={26} className="shrink-0" />
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
          Mailroom
        </span>
      </button>

      <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex h-9 w-full max-w-[540px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.055] px-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.085] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <Search className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.75} />
          <span className="hidden flex-1 truncate text-[12.5px] text-white/45 sm:block">
            Search mail, drafts, and pages…
          </span>
          <span className="flex flex-1 text-[12.5px] text-white/45 sm:hidden">Search</span>
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd tone="dark">⌘</Kbd>
            <Kbd tone="dark">K</Kbd>
          </span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate('queue')}
          aria-label={
            pendingCount > 0
              ? `${pendingCount} drafts waiting for review`
              : 'Approval queue'
          }
          title="Approval queue"
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal px-1 text-[9px] font-semibold text-white ring-2 ring-[#151515]">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title="Settings"
          aria-label="Settings"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white ring-1 ring-white/15">
            ME
          </span>
        </button>
      </div>
    </header>
  );
}
