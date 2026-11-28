import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { signInDemo } from '../lib/demoAuth';

export function Auth({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signInDemo();
    onSignedIn();
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <a href="/" className="auth-brand" aria-label="Mailroom home">
          <Mail size={18} strokeWidth={1.7} />
          <span>Mailroom</span>
        </a>
        <a className="auth-context" href="/">Back to Mailroom</a>
      </header>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h1>{mode === 'signin' ? 'Log into your workspace' : 'Create your workspace'}</h1>
          <p className="auth-note">
            Demo access — any email and password opens the portal.
          </p>

          <div className="auth-fields">
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </label>
          </div>

          <button className="auth-submit" type="submit">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <p className="auth-switch">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
