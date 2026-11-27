import { FlaskConical, MailWarning } from 'lucide-react';
import type { Health } from '../lib/api';
import type { View } from '../App';
import { Badge } from './ui';

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  queue: 'Approval queue',
  kb: 'Knowledge base',
  settings: 'Settings',
  detail: 'Email',
};

export function TopBar({
  view,
  health,
  apiReachable,
}: {
  view: View;
  health: Health | null;
  apiReachable: boolean;
}) {
  return (
    <header className="topbar">
      <div className="topbar-path"><span>WORKSPACE</span><span className="topbar-slash">/</span><strong>{VIEW_TITLES[view]}</strong></div>
      <div className="flex items-center gap-2">
        {!apiReachable ? (
          <Badge tone="error">
            <MailWarning className="h-3.5 w-3.5" strokeWidth={1.5} />
            API unreachable
          </Badge>
        ) : health ? (
          health.mode === 'mock' ? (
            <Badge tone="warning">
              <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} />
              Demo mode
            </Badge>
          ) : health.llm_available === false ? (
            <Badge tone="warning">
              <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} />
              Setup needed
            </Badge>
          ) : (
            <Badge tone="success">Live · {health.provider}</Badge>
          )
        ) : null}
      </div>
    </header>
  );
}

export function SetupBanner({ health }: { health: Health | null }) {
  if (!health || health.mode !== 'live' || !health.setup_hint) return null;
  return (
    <div className="border-b border-border bg-tint-warning px-6 py-2.5">
      <p className="text-[13px] text-warning">
        <span className="font-medium">Setup needed</span> — {health.setup_hint}
      </p>
    </div>
  );
}

export function DemoBanner({ health }: { health: Health | null }) {
  if (!health || health.mode !== 'mock') return null;
  return (
    <div className="border-b border-border bg-tint-warning px-6 py-2.5">
      <p className="text-[13px] text-warning">
        <span className="font-medium">Demo data</span> — no real Gmail connected.
        Connect Gmail in Settings to process your real inbox.
      </p>
    </div>
  );
}
