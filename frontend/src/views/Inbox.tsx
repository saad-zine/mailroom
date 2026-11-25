import { useEffect, useMemo, useState } from 'react';
import { api, type Category, type EmailItem } from '../lib/api';
import { formatRelativeTime, initials, senderName } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  FilterChip,
  LoadingState,
} from '../components/ui';

const CATEGORY_FILTERS: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'product_enquiry', label: 'Product enquiry' },
  { id: 'customer_complaint', label: 'Complaint' },
  { id: 'customer_feedback', label: 'Feedback' },
  { id: 'unrelated', label: 'Unrelated' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Any status' },
  { id: 'has_draft', label: 'Draft ready' },
  { id: 'no_draft', label: 'No draft' },
] as const;

export function Inbox({ onOpenEmail }: { onOpenEmail: (id: string) => void }) {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'has_draft' | 'no_draft'>('all');

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .listEmails({
        category: category === 'all' ? undefined : category,
        limit: 50,
      })
      .then((res) => setEmails(res.emails))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [category]);

  const visible = useMemo(() => {
    if (status === 'has_draft') return emails.filter((e) => e.has_draft);
    if (status === 'no_draft') return emails.filter((e) => !e.has_draft);
    return emails;
  }, [emails, status]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Inbox</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Every email Mailroom has categorized. Open one to review its draft.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            active={category === f.id}
            onClick={() => setCategory(f.id)}
          >
            {f.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            active={status === f.id}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <Card>
          <LoadingState label="Loading emails…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="No emails match these filters"
            subtitle={
              emails.length === 0
                ? 'The inbox is empty. Run Mailroom to fetch and process mail.'
                : 'Try a different category or status filter.'
            }
            action={
              emails.length === 0 ? undefined : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCategory('all');
                    setStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-[#f3f4f6]">
          {visible.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEmail(e.id)}
              className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                {initials(e.sender)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {senderName(e.sender)}
                  </span>
                  <span className="shrink-0 text-xs text-faint">
                    {formatRelativeTime(e.received_at)}
                  </span>
                </span>
                <span className="block truncate text-sm text-ink">{e.subject}</span>
                <span className="block truncate text-[13px] text-muted">{e.snippet}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <CategoryBadge category={e.category} />
                {e.has_draft ? (
                  <Badge tone="teal">Draft ready</Badge>
                ) : (
                  <Badge tone="neutral">No draft</Badge>
                )}
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
