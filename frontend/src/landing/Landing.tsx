import { useEffect, useState, type CSSProperties } from 'react';
import { BrandMark } from './BrandMark';
import { BotMark } from './GrokBot';
import './landing.css';

/** The nine tinted heads from x.ai's bot row. */
const BOT_TINTS = [
  '#97683D',
  '#EA4045',
  '#ED712E',
  '#F19D38',
  '#5BC67A',
  '#54B9A6',
  '#3C82F6',
  '#885CF5',
  '#EB4699',
];

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#app', label: 'The app' },
  { href: '#privacy', label: 'Privacy' },
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

export default function Landing() {
  const [solid, setSolid] = useState(false);

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
          <BrandMark size={22} />
          <span className="lp-brand-word">Mailroom</span>
        </a>

        <div className="lp-nav-links">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="lp-nav-actions">
          <a className="lp-btn lp-btn-quiet" href="/app">
            Sign in
          </a>
          <a className="lp-btn lp-btn-solid" href="/app">
            Start automating
            <Arrow />
          </a>
        </div>
      </nav>

      <section className="lp-hero" id="top">
        <div className="lp-hero-inner">
          <span className="lp-pill">
            <span className="lp-pill-text">
              <b>Private by default.</b> Read &amp; draft access only
            </span>
            <span className="lp-pill-badge" aria-hidden="true">
              <BotMark size={14} fg="#ffffff" bg="#1a1a1a" />
            </span>
          </span>

          <h1 className="lp-h1">
            <Word i={0}>Meet</Word>{' '}
            <span className="lp-word lp-bot-inline" style={{ '--i': 1 } as CSSProperties}>
              <BotMark size="100%" animated />
            </span>{' '}
            <Word i={2}>Mailroom</Word>
          </h1>

          <p className="lp-hero-sub">
            Mailroom reads your inbox, drafts the reply in your voice, and waits.
            Nothing leaves your Gmail until you say so.
          </p>

          <div className="lp-hero-actions">
            <a className="lp-btn lp-btn-solid lp-btn-lg" href="/app">
              <BrandMark size={18} strokeWidth={4.5} />
              Start automating
            </a>
            <a className="lp-btn lp-btn-card lp-btn-lg" href="#how">
              How it works
            </a>
          </div>
        </div>

        <div className="lp-bot-row" aria-hidden="true">
          {BOT_TINTS.map((tint, index) => (
            <span
              className="lp-bot-row-item"
              key={tint}
              style={{ '--i': index } as CSSProperties}
            >
              <BotMark size="100%" fg={tint} bg="#0a0a0a" />
            </span>
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
                <a className="lp-btn lp-btn-solid" href="/app">
                  Start automating
                  <Arrow />
                </a>
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

      <section className="lp-close">
        <div className="lp-close-inner" data-reveal>
          <BotMark size={44} fg="#ffffff" bg="#050505" />
          <h2>
            <Word i={0}>Open</Word> <Word i={1}>the</Word>{' '}
            <span className="lp-word lp-bot-inline" style={{ '--i': 2 } as CSSProperties}>
              <BotMark size="100%" fg="#ffffff" bg="#050505" animated />
            </span>{' '}
            <Word i={3}>mailroom.</Word>
          </h2>
          <p>
            Connect a Gmail account. Mailroom drafts the first reply and waits for
            your decision.
          </p>
          <a className="lp-btn lp-btn-solid lp-btn-lg" href="/app">
            Start automating
            <Arrow />
          </a>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-footer-brand">
            <BrandMark size={18} />
            Mailroom
          </span>
          <div className="lp-footer-links">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="/app">Sign in</a>
          </div>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
