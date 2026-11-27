import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { LetterScene } from './MascotBot.tsx';
import './landing.css';

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
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2 9L9 2M9 2H3.5M9 2V7.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export default function Landing() {
  const [solid, setSolid] = useState(false);
  const [dragged, setDragged] = useState(false);

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

  const firstDrag = useCallback(() => setDragged(true), []);

  return (
    <div className="lp">
      <nav className={`lp-nav${solid ? ' is-solid' : ''}`} aria-label="Main">
        <a className="lp-brand" href="#top" aria-label="Mailroom home">
          <span className="lp-brand-mark" aria-hidden="true" />
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
          <a className="lp-btn lp-btn-ghost" href="/app">
            Sign in
          </a>
          <a className="lp-btn lp-btn-solid" href="/app">
            Open Mailroom
            <Arrow />
          </a>
        </div>
      </nav>

      <section className="lp-hero" id="top">
        <div className="lp-hero-body">
          <div className="lp-title">
            <p className="lp-kicker">AI correspondence — private by default</p>
            <h1>
              <span className="lp-line">
                <span>Correspondence,</span>
              </span>
              <span className="lp-line">
                <span>considered.</span>
              </span>
            </h1>
          </div>

          <LetterScene className="lp-canvas" onFirstDrag={firstDrag} />

          <div className={`lp-drag-hint${dragged ? ' is-used' : ''}`}>
            360° — drag to rotate
          </div>

          <div className="lp-meta">
            <div className="lp-meta-item">
              <span className="lp-meta-row">
                <span className="lp-sq" aria-hidden="true" />
                <b>Gmail</b>
              </span>
              <small>reads &amp; drafts</small>
            </div>
            <div className="lp-meta-item">
              <span className="lp-meta-row">
                <span className="lp-sq" aria-hidden="true" />
                <b>Approval</b>
              </span>
              <small>yours alone</small>
            </div>
          </div>

          <p className="lp-blurb">
            Mailroom reads your inbox, drafts the reply in your voice, and waits.{' '}
            <b>Nothing leaves your Gmail until you say so.</b>
          </p>

          <div className="lp-outro">
            Nothing
            <br />
            <em>sends itself.</em>
          </div>
        </div>

        <div className="lp-hero-grain" aria-hidden="true" />
        <div className="lp-scroll" aria-hidden="true">
          Scroll
          <i />
        </div>
      </section>

      <main className="lp-main">
        <section className="lp-section" id="how">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <div>
                <p className="lp-eyebrow">How it works</p>
                <h2>
                  Three steps.
                  <br />
                  <em>You keep the pen.</em>
                </h2>
              </div>
              <p>
                Mailroom is a copilot, not an auto-responder. It prepares the reply and leaves
                the decision where it belongs.
              </p>
            </div>

            <div className="lp-steps">
              {STEPS.map((step, index) => (
                <article
                  className="lp-step"
                  key={step.n}
                  data-reveal
                  style={{ '--delay': `${index * 90}ms` } as CSSProperties}
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
            <div className="lp-head" data-reveal>
              <div>
                <p className="lp-eyebrow">The workspace</p>
                <h2>
                  Everything on <em>one desk.</em>
                </h2>
              </div>
              <p>
                The inbox, the drafts, and the knowledge behind them — with the reasoning left
                visible, so you can check the work before you sign it.
              </p>
            </div>

            <div data-reveal>
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
                  Connect a Gmail account and the first drafts appear in the queue. Edit them,
                  approve them, or throw them away — the call is always yours.
                </p>
                <a className="lp-btn lp-btn-ink" href="/app">
                  Open Mailroom
                  <Arrow />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="privacy">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <div>
                <p className="lp-eyebrow">Privacy</p>
                <h2>
                  Your mail <em>stays yours.</em>
                </h2>
              </div>
              <p>
                The narrowest access that works, encrypted at rest, isolated by account. If you
                want out, one click disconnects the account.
              </p>
            </div>

            <div className="lp-facts">
              {FACTS.map((fact, index) => (
                <article
                  className="lp-fact"
                  key={fact.label}
                  data-reveal
                  style={{ '--delay': `${(index % 2) * 80}ms` } as CSSProperties}
                >
                  <span className="lp-fact-label">{fact.label}</span>
                  <h3>{fact.title}</h3>
                  <p>{fact.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section className="lp-close">
        <div className="lp-wrap lp-close-inner">
          <div data-reveal>
            <p className="lp-eyebrow" style={{ color: 'rgba(241,234,217,0.5)' }}>
              Start
            </p>
            <h2>
              Open the <em>mailroom.</em>
            </h2>
          </div>
          <div className="lp-close-side" data-reveal style={{ '--delay': '120ms' } as CSSProperties}>
            <p>
              Connect a Gmail account. Mailroom drafts the first reply and waits for your
              decision.
            </p>
            <a className="lp-btn lp-btn-cream" href="/app">
              Open Mailroom
              <Arrow />
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>Mailroom — correspondence, considered</span>
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
