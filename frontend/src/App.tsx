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

export type View = 'dashboard' | 'inbox' | 'queue' | 'kb' | 'settings' | 'detail';

export default function App() {
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
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} pendingCount={pendingCount} />
      <div className="app-content">
        <TopBar view={view} health={health} apiReachable={apiReachable} />
        <DemoBanner health={health} />
        <SetupBanner health={health} />
        <main className="app-main">
          <div className="main-inner">
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
