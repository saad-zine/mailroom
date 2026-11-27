import { useState } from 'react';
import { supabase, storeToken } from '../lib/supabase';
import { BrandMark } from '../landing/BrandMark';
import { Button, Card, PageHeader } from './ui';

export function Auth({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const { error: signupError } = await supabase.auth.signUp({ email, password });
        if (signupError) throw signupError;
        setNotice('Account created. Check your email if confirmation is required, then sign in.');
        setMode('signin');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        storeToken(data.session?.access_token ?? null);
        onSignedIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm space-y-5">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[9.5px] tracking-[0.22em] text-faint uppercase transition-colors hover:text-ink"
        >
          <BrandMark size={16} className="text-teal" />
          Mailroom
        </a>
        <PageHeader
          title={mode === 'signin' ? 'Sign in to Mailroom' : 'Create an account'}
          description="Your Gmail connection and drafts stay private to your workspace."
        />
        <Card className="space-y-4 p-6">
          <label className="block">
            <span className="text-[11.5px] font-medium text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1.5 h-9 w-full rounded-[10px] border border-border bg-wash/50 px-3 text-[13px] text-ink placeholder:text-faint focus:border-teal/40 focus:bg-white focus:outline-none"
              placeholder="you@company.com"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-medium text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="mt-1.5 h-9 w-full rounded-[10px] border border-border bg-wash/50 px-3 text-[13px] text-ink placeholder:text-faint focus:border-teal/40 focus:bg-white focus:outline-none"
              placeholder="••••••••"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
            />
          </label>

          {error && <p className="text-[11.5px] text-error">{error}</p>}
          {notice && <p className="text-[11.5px] text-success">{notice}</p>}

          <Button
            variant="primary"
            className="w-full"
            onClick={() => void submit()}
            loading={busy}
            disabled={!email || password.length < 6}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            className="w-full cursor-pointer text-[11.5px] text-muted hover:text-ink"
          >
            {mode === 'signin'
              ? 'Need an account? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </Card>
      </div>
    </div>
  );
}
