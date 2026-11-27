import { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Queue } from './views/Queue';
import { EmailDetail } from './views/EmailDetail';
import { KnowledgeBase } from './views/KnowledgeBase';
import { Settings } from './views/Settings';
import { Auth } from './components/Auth';
import { authEnabled, storeToken, supabase } from './lib/supabase';

export type View = 'dashboard' | 'inbox' | 'queue' | 'kb' | 'settings' | 'detail';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [returnView, setReturnView] = useState<View>('inbox');
  const [apiReachable, setApiReachable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(!authEnabled);
  const [authChecked, setAuthChecked] = useState(!authEnabled);

  const refreshPending = useCallback(() => {
    api
      .listDrafts('pending')
      .then((res) => setPendingCount(res.drafts.length))
      .catch(() => setPendingCount(0));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      storeToken(session?.access_token ?? null);
      setSignedIn(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      storeToken(data.session?.access_token ?? null);
      setSignedIn(Boolean(data.session));
      setAuthChecked(true);
    });
  }, []);

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
    setSearchOpen(false);
  };

  const openEmail = (id: string, from: View = 'inbox') => {
    setReturnView(from === 'detail' ? 'inbox' : from);
    setSelectedEmailId(id);
    setView('detail');
    setMobileNavOpen(false);
    setSearchOpen(false);
  };

  const backFromDetail = () => {
    setSelectedEmailId(null);
    setView(returnView);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    storeToken(null);
    setSignedIn(false);
    setView('dashboard');
  };

  if (!authChecked) return <div className="h-full bg-canvas" />;
  if (authEnabled && !signedIn) return <Auth onSignedIn={() => setSignedIn(true)} />;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <TopBar
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
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-7 sm:py-8">
            {!apiReachable && view !== 'settings' && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-error/15 bg-tint-error px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-error ring-1 ring-error/10 ring-inset">
                  <WifiOff className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="text-[12.5px] leading-relaxed text-body">
                  <span className="font-semibold text-ink">API unreachable</span>
                  {' — '}the backend is not responding.
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
              {view === 'settings' && <Settings onSignOut={signOut} signedIn={authEnabled && signedIn} />}
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
