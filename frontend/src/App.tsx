import { useCallback, useEffect, useState } from 'react';
import { api, type Health } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { DemoBanner, SetupBanner, TopBar } from './components/TopBar';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Queue } from './views/Queue';
import { EmailDetail } from './views/EmailDetail';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Settings } from './views/Settings';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export type View = 'dashboard' | 'inbox' | 'queue' | 'kb' | 'settings' | 'detail';

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [view, setView] = useState<View>('dashboard');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [returnView, setReturnView] = useState<View>('inbox');
  const [health, setHealth] = useState<Health | null>(null);
  const [apiReachable, setApiReachable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(() => {
    api
      .listDrafts('pending')
      .then((res) => setPendingCount(res.drafts.length))
      .catch(() => {
        /* sidebar badge is best-effort */
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  const navigate = (next: View) => {
    setView(next);
    setSelectedEmailId(null);
  };

  const openEmail = (id: string, from: View = 'inbox') => {
    setReturnView(from === 'detail' ? 'inbox' : from);
    setSelectedEmailId(id);
    setView('detail');
  };

  const backFromDetail = () => {
    setSelectedEmailId(null);
    setView(returnView);
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar view={view} onNavigate={navigate} pendingCount={pendingCount} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar
          view={view}
          health={health}
          apiReachable={apiReachable}
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        />
        <DemoBanner health={health} />
        <SetupBanner health={health} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1360px] px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
            {!apiReachable && view !== 'settings' && (
              <p className="mb-5 rounded-lg border border-border bg-tint-warning px-4 py-2.5 text-[13px] text-warning">
                The Mailroom API is not reachable — views below will show an error
                until the backend is running. Start it on port 8000, or set
                VITE_API_URL to its address.
              </p>
            )}
            {view === 'dashboard' && (
              <Dashboard
                onOpenEmail={(id) => openEmail(id, 'dashboard')}
                onGoInbox={() => navigate('inbox')}
                onGoQueue={() => navigate('queue')}
              />
            )}
            {view === 'inbox' && <Inbox onOpenEmail={(id) => openEmail(id, 'inbox')} />}
            {view === 'queue' && <Queue onOpenEmail={(id) => openEmail(id, 'queue')} />}
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
        </main>
      </div>
    </div>
  );
}
