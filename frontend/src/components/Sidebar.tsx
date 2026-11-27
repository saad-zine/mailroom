import { BookOpen, CheckSquare, Home, Inbox, Settings, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { View } from '../App';

const NAV: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Overview', icon: Home },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'queue', label: 'Approval queue', icon: CheckSquare },
  { id: 'kb', label: 'Knowledge base', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ view, onNavigate, pendingCount }: {
  view: View; onNavigate: (view: View) => void; pendingCount: number;
}) {
  return (
    <aside className="sidebar">
      <button type="button" onClick={() => onNavigate('dashboard')} className="sidebar-brand" aria-label="Mailroom home">
        <img src="/mailroom-icon.png" alt="" className="h-10 w-10 shrink-0" />
        <span className="brand-name">mailroom<span className="brand-dot">.</span></span>
      </button>
      <div className="sidebar-label">YOUR WORKSPACE <span>✳</span></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV.map((item, index) => {
          const Icon = item.icon;
          const active = view === item.id || (view === 'detail' && item.id === 'inbox');
          return (
            <button key={item.id} type="button" onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn('sidebar-link', active && 'sidebar-link-active')}>
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
              <span className="sidebar-link-label">{item.label}</span>
              {item.id === 'queue' && pendingCount > 0 ? <span className="sidebar-count">{pendingCount}</span> : <span className="sidebar-index">0{index + 1}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-top"><span>THE HUMAN TOUCH</span><ArrowUpRight size={15} /></div>
        <p>Good emails.<br />Better days.</p>
        <div className="sidebar-footer-bottom"><span>YOUR AI COPILOT</span><span>✳</span></div>
      </div>
    </aside>
  );
}
