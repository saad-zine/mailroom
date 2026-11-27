import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Inbox as InboxIcon,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { api, type Category, type EmailItem } from '../lib/api';
import { formatRelativeTime, senderName } from '../lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  FilterChip,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '../components/ui';
import { cn } from '../lib/utils';

const CATEGORY_FILTERS: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'All mail' },
  { id: 'product_enquiry', label: 'Product enquiry' },
  { id: 'customer_complaint', label: 'Complaint' },
  { id: 'customer_feedback', label: 'Feedback' },
  { id: 'unrelated', label: 'Unrelated' },
];

type StatusFilter = 'all' | 'has_draft' | 'no_draft';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Any status' },
  { id: 'has_draft', label: 'Draft ready' },
  { id: 'no_draft', label: 'No draft' },
];

export function Inbox({ onOpenEmail }: { onOpenEmail: (id: string) => void }) {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .listEmails({ limit: 100 })
      .then((res) => setEmails(res.emails))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(q) ||
        senderName(email.sender).toLowerCase().includes(q) ||
        email.sender.toLowerCase().includes(q) ||
        email.snippet.toLowerCase().includes(q),
    );
  }, [emails, query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: searched.length };
    for (const email of searched) {
      counts[email.category] = (counts[email.category] ?? 0) + 1;
    }
    return counts;
  }, [searched]);

  const visible = useMemo(
    () =>
      searched
        .filter((email) => category === 'all' || email.category === category)
        .filter((email) =>
          status === 'all'
            ? true
            : status === 'has_draft'
              ? email.has_draft
              : !email.has_draft,
        ),
    [searched, category, status],
  );

  const groups = useMemo(() => {
    const buckets: Array<{ label: string; emails: EmailItem[] }> = [
      { label: 'Today', emails: [] },
      { label: 'Yesterday', emails: [] },
      { label: 'Earlier', emails: [] },
    ];
    for (const email of visible) {
      const label = dayBucket(email.received_at);
      const bucket = buckets.find((entry) => entry.label === label);
      bucket?.emails.push(email);
    }
    return buckets.filter((bucket) => bucket.emails.length > 0);
  }, [visible]);

  const hasFilters = category !== 'all' || status !== 'all' || query.trim() !== '';
  const clearFilters = () => {
    setCategory('all');
    setStatus('all');
    setQuery('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mailbox"
        title="Inbox"
        description="Every email Mailroom has categorized. Open a message to review its draft, sources, and decision."
        actions={
          <>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 text-[12px] font-medium text-muted shadow-xs">
              <InboxIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="tabular-nums">{emails.length}</span> messages
            </span>
            <Button variant="secondary" size="sm" onClick={load} loading={loading && emails.length > 0}>
              {!(loading && emails.length > 0) && (
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              Refresh
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint"
                strokeWidth={1.75}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by sender, subject, or content…"
                aria-label="Search emails"
                className="h-9 w-full rounded-[10px] border border-border bg-wash/60 pr-8 pl-9 text-[13px] text-ink placeholder:text-faint transition-colors hover:border-border-strong focus:border-teal/40 focus:bg-white focus:ring-[3px] focus:ring-teal/10 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-neutral-tint hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
            <SegmentedControl
              options={STATUS_FILTERS}
              value={status}
              onChange={setStatus}
              className="self-start sm:self-auto"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                active={category === filter.id}
                onClick={() => setCategory(filter.id)}
                count={categoryCounts[filter.id] ?? 0}
              >
                {filter.label}
              </FilterChip>
            ))}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-1 inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-muted transition-colors hover:bg-neutral-tint hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
              >
                <X className="h-3 w-3" strokeWidth={2} />
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {loading && emails.length === 0 ? (
        <Card>
          <LoadingState label="Loading your inbox…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            art={emails.length === 0 ? 'inbox' : 'search'}
            title={
              emails.length === 0
                ? 'Your inbox is empty'
                : 'No emails match these filters'
            }
            subtitle={
              emails.length === 0
                ? 'Run Mailroom to fetch and process your inbox. New mail will show up here.'
                : 'Try a different category, status, or search term.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-wash/50 px-5 py-2.5">
            <p className="text-[11px] font-medium text-muted">
              <span className="tabular-nums">{visible.length}</span>{' '}
              {visible.length === 1 ? 'message' : 'messages'}
            </p>
            <p className="text-[11px] text-faint">Newest first</p>
          </div>

          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 border-b border-border/60 bg-wash/30 px-5 py-1.5">
                <p className="text-[10px] font-semibold tracking-[0.1em] text-faint uppercase">
                  {group.label}
                </p>
                <span className="text-[10px] text-faint/70 tabular-nums">
                  {group.emails.length}
                </span>
              </div>
              <div className="divide-y divide-border/70">
                {group.emails.map((email) => (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => onOpenEmail(email.id)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-wash/80 focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:ring-inset focus-visible:outline-none"
                  >
                    <Avatar name={email.sender} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">
                          {senderName(email.sender)}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-faint sm:hidden">
                          {formatRelativeTime(email.received_at)}
                        </span>
                      </span>
                      <span className="block truncate text-[12.5px] text-ink/85">
                        {email.subject}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {email.snippet}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                      <CategoryBadge category={email.category} />
                      {email.has_draft ? (
                        <Badge tone="teal" dot>
                          Draft ready
                        </Badge>
                      ) : (
                        <Badge dot={false}>No draft</Badge>
                      )}
                    </span>
                    <span className="hidden w-14 shrink-0 text-right text-[11px] text-faint md:block">
                      {formatRelativeTime(email.received_at)}
                    </span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-faint transition-transform',
                        'group-hover:translate-x-0.5 group-hover:text-muted',
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function dayBucket(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const time = date.getTime();
  if (time >= startToday) return 'Today';
  if (time >= startYesterday) return 'Yesterday';
  return 'Earlier';
}
