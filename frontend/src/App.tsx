import { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { api, type Health } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { DemoBanner, SetupBanner, TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Queue } from './views/Queue';
import { EmailDetail } from './views/EmailDetail';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Settings } from './views/Settings';

export type View = 'dashboard' | 'inbox' | 'queue' | 'kb' | 'settings' | 'detail';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [returnView, setReturnView] = useState<View>('inbox');
  const [health, setHealth] = useState<Health | null>(null);
  const [apiReachable, setApiReachable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const refreshPending = useCallback(() => {
    api
      .listDrafts('pending')
      .then((res) => setPendingCount(res.drafts.length))
      .catch(() => {
        /* sidebar badge is best-effort */
      });
  }, []);

  useEffect(() => {
    api
      .health()
      .then((h) => {
        setHealth(h);
        setApiReachable(true);
      })
      .catch(() => setApiReachable(false));
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [view, refreshPending]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = (next: View) => {
    setView(next);
    setSelectedEmailId(null);
    setMobileNavOpen(false);
  };

  const openEmail = (id: string, from: View = 'inbox') => {
    setReturnView(from === 'detail' ? 'inbox' : from);
    setSelectedEmailId(id);
    setView('detail');
    setMobileNavOpen(false);
  };

  const backFromDetail = () => {
    setSelectedEmailId(null);
    setView(returnView);
  };

  return (
    <div className="flex h-full flex-col bg-canvas">
      <TopBar
        health={health}
        apiReachable={apiReachable}
        pendingCount={pendingCount}
        onOpenSearch={() => setSearchOpen(true)}
        onNavigate={navigate}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          view={view}
          onNavigate={navigate}
          pendingCount={pendingCount}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          health={health}
          apiReachable={apiReachable}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-7 sm:py-8">
            {!bannerDismissed && view !== 'settings' && (
              <div className="mb-5 space-y-2">
                <DemoBanner
                  health={health}
                  onGoSettings={() => navigate('settings')}
                  onDismiss={() => setBannerDismissed(true)}
                />
                <SetupBanner
                  health={health}
                  onDismiss={() => setBannerDismissed(true)}
                />
              </div>
            )}

            {!apiReachable && view !== 'settings' && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-error/15 bg-tint-error px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-error ring-1 ring-error/10 ring-inset">
                  <WifiOff className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="text-[12.5px] leading-relaxed text-body">
                  <span className="font-semibold text-ink">API unreachable</span>
                  {' — '}
                  views below will show an error until the backend is running. Start
                  it on port 8000, or set{' '}
                  <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-[11px]">
                    VITE_API_URL
                  </code>{' '}
                  to its address.
                </p>
              </div>
            )}

            <div key={view} className="animate-rise">
              {view === 'dashboard' && (
                <Dashboard
                  onOpenEmail={(id) => openEmail(id, 'dashboard')}
                  onGoInbox={() => navigate('inbox')}
                  onGoQueue={() => navigate('queue')}
                />
              )}
              {view === 'inbox' && (
                <Inbox onOpenEmail={(id) => openEmail(id, 'inbox')} />
              )}
              {view === 'queue' && (
                <Queue onOpenEmail={(id) => openEmail(id, 'queue')} />
              )}
              {view === 'detail' && selectedEmailId && (
                <EmailDetail
                  emailId={selectedEmailId}
                  onBack={backFromDetail}
                  onGoSettings={() => navigate('settings')}
                  onDecided={refreshPending}
                />
              )}
              {view === 'kb' && <KnowledgeBase />}
              {view === 'settings' && <Settings />}
            </div>
          </div>
        </main>
      </div>

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
        onOpenEmail={(id) => openEmail(id, view === 'detail' ? 'inbox' : view)}
      />
    </div>
  );
}
