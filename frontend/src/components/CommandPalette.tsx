import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CornerDownLeft,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { api, type EmailItem } from '../lib/api';
import type { View } from '../App';
import { formatRelativeTime, senderName } from '../lib/utils';
import { Avatar, CategoryBadge, Kbd, Skeleton } from './ui';
import { cn } from '../lib/utils';

type PageEntry = { view: View; label: string; description: string; icon: LucideIcon };

const PAGES: PageEntry[] = [
  {
    view: 'dashboard',
    label: 'Overview',
    description: 'Workspace health and recent activity',
    icon: LayoutDashboard,
  },
  {
    view: 'inbox',
    label: 'Inbox',
    description: 'Every email Mailroom has categorized',
    icon: Inbox,
  },
  {
    view: 'queue',
    label: 'Approval queue',
    description: 'Drafts waiting for a human decision',
    icon: ListChecks,
  },
  {
    view: 'kb',
    label: 'Knowledge base',
    description: 'Docs the drafts are grounded in',
    icon: BookOpen,
  },
  {
    view: 'settings',
    label: 'Settings',
    description: 'Connection, model, and runs',
    icon: Settings,
  },
];

type PaletteItem =
  | { type: 'page'; page: PageEntry }
  | { type: 'email'; email: EmailItem };

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenEmail,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onOpenEmail: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setLoading(true);
    let cancelled = false;
    api
      .listEmails({ limit: 50 })
      .then((res) => {
        if (!cancelled) setEmails(res.emails);
      })
      .catch(() => {
        if (!cancelled) setEmails([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const frame = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(frame);
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  const items = useMemo<PaletteItem[]>(() => {
    const pages = PAGES.filter(
      (page) =>
        !q ||
        page.label.toLowerCase().includes(q) ||
        page.description.toLowerCase().includes(q),
    ).map<PaletteItem>((page) => ({ type: 'page', page }));

    const mail = emails
      .filter(
        (email) =>
          !q ||
          email.subject.toLowerCase().includes(q) ||
          senderName(email.sender).toLowerCase().includes(q) ||
          email.sender.toLowerCase().includes(q) ||
          email.snippet.toLowerCase().includes(q),
      )
      .slice(0, q ? 8 : 5)
      .map<PaletteItem>((email) => ({ type: 'email', email }));

    return [...pages, ...mail];
  }, [emails, q]);

  useEffect(() => {
    if (activeIndex > items.length - 1) setActiveIndex(0);
  }, [activeIndex, items.length]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.type === 'page') {
      onNavigate(item.page.view);
    } else {
      onOpenEmail(item.email.id);
    }
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (items.length ? (index + 1) % items.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        items.length ? (index - 1 + items.length) % items.length : 0,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(items[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let index = 0;
  const pageItems = items.filter((item) => item.type === 'page');
  const mailItems = items.filter((item) => item.type === 'email');

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 pt-[10vh] backdrop-blur-[3px] sm:pt-[14vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-pop w-full max-w-[580px] overflow-hidden rounded-2xl border border-border bg-paper shadow-pop"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search Mailroom"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-faint" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search mail, drafts, and pages…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
            aria-label="Search Mailroom"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[min(440px,58vh)] overflow-y-auto p-2">
          {loading && emails.length === 0 ? (
            <div className="space-y-1 p-1">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-tint text-faint ring-1 ring-black/[0.03] ring-inset">
                <Search className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-ink">No matches</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Try a sender, subject, or page name.
              </p>
            </div>
          ) : (
            <>
              {pageItems.length > 0 && (
                <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">
                  Pages
                </p>
              )}
              {pageItems.map((item) => {
                if (item.type !== 'page') return null;
                const current = index;
                index += 1;
                const Icon = item.page.icon;
                const active = current === activeIndex;
                return (
                  <button
                    key={`page-${item.page.view}`}
                    type="button"
                    data-index={current}
                    onMouseEnter={() => setActiveIndex(current)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-neutral-tint' : 'hover:bg-neutral-tint/60',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-muted ring-1 ring-border">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {item.page.label}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {item.page.description}
                      </span>
                    </span>
                    {active && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.75} />
                    )}
                  </button>
                );
              })}

              {mailItems.length > 0 && (
                <p className="mt-1 px-2.5 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">
                  {q ? 'Mail' : 'Recent mail'}
                </p>
              )}
              {mailItems.map((item) => {
                if (item.type !== 'email') return null;
                const current = index;
                index += 1;
                const active = current === activeIndex;
                return (
                  <button
                    key={`email-${item.email.id}`}
                    type="button"
                    data-index={current}
                    onMouseEnter={() => setActiveIndex(current)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-neutral-tint' : 'hover:bg-neutral-tint/60',
                    )}
                  >
                    <Avatar name={item.email.sender} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[12.5px] font-medium text-ink">
                          {senderName(item.email.sender)}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-faint">
                          {formatRelativeTime(item.email.received_at)}
                        </span>
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {item.email.subject}
                      </span>
                    </span>
                    <CategoryBadge category={item.email.category} dot={false} />
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-wash/60 px-4 py-2.5 text-[10.5px] text-faint">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            open
          </span>
          <span className="ml-auto hidden items-center gap-1 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
