import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { BotMark } from './GrokBot';
import { signInDemo } from '../lib/demoAuth';
import './landing.css';

const NAV = [
  { href: '#top', label: 'Overview' },
  { href: '#how', label: 'How it works' },
  { href: '#app', label: 'Workspace' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#start', label: 'Start' },
];

const DETAILS = [
  { label: 'Read & draft', body: 'We never send or delete mail. You approve every saved draft.' },
  { label: 'Source-backed', body: 'See the knowledge-base references behind every reply.' },
  { label: 'Human approval', body: 'Edit, approve, or reject each draft before it reaches Gmail.' },
  { label: 'Private workspace', body: 'Your inbox, drafts, and documents stay scoped to you.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Connect Gmail',
    body: 'Authorize read and draft access. Tokens are encrypted per workspace, and you can revoke them at any time.',
  },
  {
    n: '02',
    title: 'It drafts',
    body: 'Each new message is categorized, matched against your knowledge base, and answered in your voice — with the sources shown.',
  },
  {
    n: '03',
    title: 'You decide',
    body: 'Approve, edit, or reject. Approving creates a draft in your Gmail. Nothing is ever sent for you.',
  },
];

const FACTS = [
  {
    label: 'Scope',
    title: 'Read and draft only',
    body: 'Mailroom requests gmail.readonly and gmail.modify. It cannot send mail, delete threads, or read anything you have not granted.',
  },
  {
    label: 'Storage',
    title: 'Encrypted tokens',
    body: 'OAuth refresh tokens are encrypted at rest with a key that never leaves the server. Disconnecting revokes the watch immediately.',
  },
  {
    label: 'Isolation',
    title: 'One workspace per account',
    body: 'Every email, draft, and document is scoped to your account, and Postgres row-level security enforces the same rule underneath the API.',
  },
  {
    label: 'Control',
    title: 'Nothing sends itself',
    body: 'Approval is a human action. Mailroom writes a draft into Gmail and stops there — the send button stays yours.',
  },
];

function Arrow() {
  return (
    <svg
      className="lp-arrow"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 11 11 5M6.5 5H11v4.5" />
    </svg>
  );
}

/** One word, revealed on a stagger. */
function Word({ children, i }: { children: string; i: number }) {
  return (
    <span className="lp-word" style={{ '--i': i } as CSSProperties}>
      {children}
    </span>
  );
}

function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    signInDemo();
    window.location.assign('/app');
  };

  return (
    <dialog
      ref={dialogRef}
      className="lp-dialog lp-auth-dialog"
      aria-labelledby="lp-auth-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button className="lp-dialog-close" type="button" aria-label="Close sign in" onClick={onClose}>
        <X size={18} strokeWidth={1.75} />
      </button>
      <p className="lp-eyebrow">Mailroom workspace</p>
      <h2 id="lp-auth-title">{mode === 'signin' ? 'Welcome back.' : 'Create your workspace.'}</h2>
      <p className="lp-dialog-copy">Sign in to review drafts and keep every reply in your hands.</p>
      <form className="lp-dialog-form" onSubmit={submit}>
        <label>
          <span>Email</span>
          <input type="email" name="email" autoComplete="email" placeholder="you@company.com" required autoFocus />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Enter your password"
            required
          />
        </label>
        <button className="lp-btn lp-btn-solid lp-dialog-submit" type="submit">
          {mode === 'signin' ? 'Sign in' : 'Create workspace'}
          <Arrow />
        </button>
      </form>
      <p className="lp-dialog-switch">
        {mode === 'signin' ? "New to Mailroom?" : 'Already have an account?'}{' '}
        <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </dialog>
  );
}

function PricingDialog({
  onClose,
  onChoosePlan,
}: {
  onClose: () => void;
  onChoosePlan: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="lp-dialog lp-pricing-dialog"
      aria-labelledby="lp-pricing-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button className="lp-dialog-close" type="button" aria-label="Close pricing" onClick={onClose}>
        <X size={18} strokeWidth={1.75} />
      </button>
      <p className="lp-eyebrow">Clear, human-first pricing</p>
      <h2 id="lp-pricing-title">Mailroom pricing</h2>
      <p className="lp-dialog-copy">Get started in the private beta. We&apos;ll share paid plan details before launch.</p>
      <div className="lp-pricing-grid">
        <article className="lp-pricing-card is-featured">
          <span className="lp-pricing-name">Private beta</span>
          <h3>Free</h3>
          <p>Try the full review workflow while Mailroom is in beta.</p>
          <ul>
            <li>Connect one Gmail account</li>
            <li>Source-backed draft suggestions</li>
            <li>Human approval on every reply</li>
          </ul>
          <button className="lp-btn lp-btn-solid" type="button" onClick={onChoosePlan}>
            Join the beta
            <Arrow />
          </button>
        </article>
        <article className="lp-pricing-card">
          <span className="lp-pricing-name">After beta</span>
          <h3>Paid plans, announced soon</h3>
          <p>No surprise charges. We&apos;ll publish plan limits and pricing before any paid tier is available.</p>
          <ul>
            <li>Personal and team options</li>
            <li>Clear usage limits</li>
            <li>Upgrade only when you choose</li>
          </ul>
        </article>
      </div>
    </dialog>
  );
}

export default function Landing() {
  const [solid, setSolid] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp">
      <nav className={`lp-nav${solid ? ' is-solid' : ''}`} aria-label="Main">
        <a className="lp-brand" href="#top" aria-label="Mailroom home">
          <img
            src="/mailroom-wordmark.png"
            alt="Mailroom"
            className="h-[19px] w-[108px] object-contain"
          />
        </a>

        <div className="lp-nav-links">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="lp-nav-actions">
          <button className="lp-btn lp-btn-quiet" type="button" onClick={() => setLoginOpen(true)}>
            Sign in
          </button>
          <button className="lp-btn lp-btn-solid" type="button" onClick={() => setPricingOpen(true)}>
            Pricing
          </button>
        </div>
      </nav>

      <section className="lp-hero" id="top">
        <div className="lp-hero-inner">
          <span className="lp-pill">
            <span className="lp-pill-text">
              <b>Your approval stays in control.</b> Nothing sends itself.
            </span>
          </span>

          <h1 className="lp-h1">
            <Word i={0}>Your</Word>{' '}
            <Word i={1}>inbox,</Word>{' '}
            <span className="lp-word lp-bot-inline" style={{ '--i': 2 } as CSSProperties}>
              <BotMark size="100%" fg="#ffffff" bg="#0a0a0a" animated />
            </span>{' '}
            <Word i={3}>handled.</Word>
          </h1>

          <p className="lp-hero-sub">
            Mailroom reads every new email, drafts a reply in your voice with the
            sources shown, and waits for your approval. Nothing leaves your Gmail
            until you say so.
          </p>

          <div className="lp-hero-actions">
            <a className="lp-btn lp-btn-solid lp-btn-lg" href="#app">
              See the workspace
              <Arrow />
            </a>
            <a className="lp-btn lp-btn-card lp-btn-lg" href="#how">
              How it works
            </a>
          </div>
        </div>

        <div className="lp-detail-strip">
          {DETAILS.map((detail, index) => (
            <div
              className="lp-detail"
              key={detail.label}
              data-reveal
              style={{ '--delay': `${index * 60}ms` } as CSSProperties}
            >
              <h2 className="lp-detail-label">{detail.label}</h2>
              <p>{detail.body}</p>
            </div>
          ))}
        </div>

      </section>

      <main className="lp-main">
        <section className="lp-section" id="how">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <h2>
                Three steps. <em>You keep the pen.</em>
              </h2>
              <div className="lp-head-copy">
                <p>
                  Mailroom is a copilot, not an auto-responder. It prepares the reply
                  and leaves the decision where it belongs.
                </p>
              </div>
            </div>

            <div className="lp-grid lp-grid-3" data-reveal>
              {STEPS.map((step, index) => (
                <article
                  className="lp-card lp-step"
                  key={step.n}
                  style={{ '--delay': `${index * 80}ms` } as CSSProperties}
                >
                  <span className="lp-step-num">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" id="app">
          <div className="lp-wrap">
            <div className="lp-head lp-head-center" data-reveal>
              <h2>
                Everything on <em>one desk.</em>
              </h2>
              <div className="lp-head-copy">
                <p>
                  The inbox, the drafts, and the knowledge behind them — with the
                  reasoning left visible, so you can check the work before you sign it.
                </p>
              </div>
            </div>

            <div className="lp-shot-wrap" data-reveal>
              <div className="lp-shot-head">
                <span>Approval queue — live API state</span>
                <span>Mailroom / Workspace</span>
              </div>
              <div className="lp-shot">
                <img
                  src="/app-preview.webp"
                  alt="The Mailroom approval queue, showing drafts waiting for review with category and status badges."
                  width="1600"
                  height="1000"
                  loading="lazy"
                />
              </div>

              <div className="lp-shot-cta">
                <p>
                  Connect a Gmail account and the first drafts appear in the queue.
                  Edit them, approve them, or throw them away — the call is always
                  yours.
                </p>
                <button className="lp-btn lp-btn-solid" type="button" onClick={() => setLoginOpen(true)}>
                  Open the workspace
                  <Arrow />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="privacy">
          <div className="lp-wrap">
            <div className="lp-head lp-head-center" data-reveal>
              <h2>
                Your mail <em>stays yours.</em>
              </h2>
              <div className="lp-head-copy">
                <p>
                  The narrowest access that works, encrypted at rest, isolated by
                  account. If you want out, one click disconnects the account.
                </p>
              </div>
            </div>

            <div className="lp-grid lp-grid-2" data-reveal>
              {FACTS.map((fact, index) => (
                <article
                  className="lp-card lp-fact"
                  key={fact.label}
                  style={{ '--delay': `${(index % 2) * 80}ms` } as CSSProperties}
                >
                  <span className="lp-eyebrow">{fact.label}</span>
                  <h3>{fact.title}</h3>
                  <p>{fact.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section className="lp-start" id="start">
        <div className="lp-start-inner" data-reveal>
          <div className="lp-start-copy">
            <p className="lp-eyebrow">Your inbox, with you in control</p>
            <h2>
              A draft is a <em>starting point.</em>
            </h2>
            <p>
              Mailroom prepares replies with the source material attached. You
              review, edit, or dismiss every one before anything is saved to Gmail.
            </p>
          </div>

          <div className="lp-start-card">
            <h3>Start with a private workspace</h3>
            <p>Connect Gmail when you&apos;re ready. Nothing is sent automatically.</p>
            <button className="lp-btn lp-btn-solid" type="button" onClick={() => setLoginOpen(true)}>
              Continue to Mailroom
              <Arrow />
            </button>
          </div>
        </div>
      </section>

      <section className="lp-close">
        <div className="lp-close-inner" data-reveal>
          <h2>
            <Word i={0}>Open</Word> <Word i={1}>the</Word>{' '}
            <span className="lp-word lp-bot-inline" style={{ '--i': 2 } as CSSProperties}>
              <BotMark
                size="100%"
                bg="#050505"
                animated
                gradient
                gradientColors={['#EA4045', '#F6C945', '#3C82F6', '#FFFFFF']}
              />
            </span>{' '}
            <Word i={3}>mailroom.</Word>
          </h2>
          <p>
            Connect a Gmail account. Mailroom drafts the first reply and waits for
            your decision.
          </p>
          <button className="lp-btn lp-btn-solid lp-btn-lg" type="button" onClick={() => setLoginOpen(true)}>
            Open the workspace
            <Arrow />
          </button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-footer-brand">
            <img
              src="/mailroom-wordmark.png"
              alt="Mailroom"
              className="h-4 w-[90px] object-contain"
            />
          </span>
          <nav className="lp-footer-links" aria-label="Footer">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <button type="button" onClick={() => setLoginOpen(true)}>Sign in</button>
          </nav>
          <span>© 2026</span>
        </div>
      </footer>

      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
      {pricingOpen && (
        <PricingDialog
          onClose={() => setPricingOpen(false)}
          onChoosePlan={() => {
            setPricingOpen(false);
            setLoginOpen(true);
          }}
        />
      )}
    </div>
  );
}
