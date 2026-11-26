import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Queue } from './views/Queue';
import { EmailDetail } from './views/EmailDetail';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Settings } from './views/Settings';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  return 'light';
}

export type View = 'dashboard' | 'inbox' | 'queue' | 'kb' | 'settings' | 'detail';

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [view, setView] = useState<View>('dashboard');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [returnView, setReturnView] = useState<View>('inbox');
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
      .then(() => setApiReachable(true))
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
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        onNavigateHome={() => navigate('dashboard')}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onNavigate={navigate} pendingCount={pendingCount} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1040px] px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
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
    </div>
  );
}
