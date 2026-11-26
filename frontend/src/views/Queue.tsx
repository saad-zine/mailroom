import { useEffect, useState } from 'react';
import { api, type Draft, type DraftStatus } from '../lib/api';
import { formatRelativeTime, initials, senderName } from '../lib/utils';
import {
  Card,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  FilterChip,
  LoadingState,
  PageHeader,
} from '../components/ui';

const STATUS_FILTERS: Array<{ id: DraftStatus | 'all'; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'sent', label: 'Sent' },
  { id: 'all', label: 'All' },
];

export function Queue({ onOpenEmail }: { onOpenEmail: (id: string) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus | 'all'>('pending');

  const load = () => {
    setLoading(true);
    setError(null);
    const req =
      status === 'all'
        ? Promise.all([
            api.listDrafts('pending'),
            api.listDrafts('approved'),
            api.listDrafts('rejected'),
            api.listDrafts('sent'),
          ]).then((parts) => ({ drafts: parts.flatMap((p) => p.drafts) }))
        : api.listDrafts(status);
    req
      .then((res) => setDrafts(res.drafts))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approval queue"
        description="Every draft Mailroom wrote, waiting for a human decision. Nothing is sent without your approval."
      />

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <FilterChip key={f.id} active={status === f.id} onClick={() => setStatus(f.id)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <Card>
          <LoadingState label="Loading drafts…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : drafts.length === 0 ? (
        <Card>
          <EmptyState
            title={
              status === 'pending'
                ? 'Queue is clear'
                : `No ${status} drafts`
            }
            subtitle={
              status === 'pending'
                ? 'No drafts are waiting for review. New mail will appear here once Mailroom drafts a reply.'
                : 'Try a different status filter.'
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {drafts.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpenEmail(d.email_id)}
              className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                {initials(d.sender)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {d.subject}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {senderName(d.sender)} · drafted {formatRelativeTime(d.created_at)}
                </span>
                {d.decision_note && (
                  <span className="block truncate text-[13px] italic text-muted">
                    “{d.decision_note}”
                  </span>
                )}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <CategoryBadge category={d.category} />
                <DraftStatusBadge status={d.status} />
              </span>
            </button>
          ))}
        </Card>
      )}

      {drafts.length > 0 && status === 'pending' && (
        <p className="text-xs text-faint">
          {drafts.length} draft{drafts.length === 1 ? '' : 's'} awaiting review.
        </p>
      )}
    </div>
  );
}
