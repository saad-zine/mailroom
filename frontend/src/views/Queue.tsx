import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { api, type Draft, type DraftStatus } from '../lib/api';
import { formatRelativeTime, senderName } from '../lib/utils';
import {
  Avatar,
  Card,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '../components/ui';

const STATUS_FILTERS: Array<{ id: DraftStatus | 'all'; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'sent', label: 'Sent' },
  { id: 'all', label: 'All' },
];

const STATUS_ORDER: DraftStatus[] = ['pending', 'approved', 'rejected', 'sent'];

export function Queue({ onOpenEmail }: { onOpenEmail: (id: string) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus | 'all'>('pending');

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all(STATUS_ORDER.map((value) => api.listDrafts(value)))
      .then((parts) => setDrafts(parts.flatMap((part) => part.drafts)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: drafts.length };
    for (const draft of drafts) {
      result[draft.status] = (result[draft.status] ?? 0) + 1;
    }
    return result;
  }, [drafts]);

  const visible = useMemo(() => {
    const filtered =
      status === 'all' ? drafts : drafts.filter((draft) => draft.status === status);
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [drafts, status]);

  const options = STATUS_FILTERS.map((filter) => ({
    ...filter,
    count: counts[filter.id] ?? 0,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Review"
        title="Approval queue"
        description="Every draft Mailroom wrote, waiting for a human decision. Read it, edit it if you like, then approve or reject — nothing is sent on its own."
        actions={
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 text-[12px] font-medium text-muted shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-teal" strokeWidth={1.75} />
            <span className="tabular-nums">{counts.pending ?? 0}</span> waiting
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl options={options} value={status} onChange={setStatus} />
        {visible.length > 0 && (
          <span className="ml-auto text-[11px] text-faint">
            <span className="tabular-nums">{visible.length}</span>{' '}
            {visible.length === 1 ? 'draft' : 'drafts'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((row) => (
            <Card key={row} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-5 h-3 w-2/3" />
              <Skeleton className="mt-2.5 h-2.5 w-full" />
              <Skeleton className="mt-1.5 h-2.5 w-5/6" />
              <div className="mt-5 flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            art="queue"
            title={status === 'pending' ? 'Queue is clear' : `No ${status} drafts`}
            subtitle={
              status === 'pending'
                ? 'No drafts are waiting for review. New mail will appear here once Mailroom drafts a reply.'
                : 'Try a different status filter — there may be drafts in another state.'
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onOpenEmail(draft.email_id)}
                className="group relative flex h-full cursor-pointer flex-col rounded-xl border border-border bg-paper p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={draft.sender} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {senderName(draft.sender)}
                      </p>
                      <p className="text-[11px] text-faint">
                        Drafted {formatRelativeTime(draft.created_at)}
                      </p>
                    </div>
                  </div>
                  <DraftStatusBadge status={draft.status} />
                </div>

                <h3 className="mt-4 line-clamp-1 text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  {draft.subject}
                </h3>
                <p className="clamp-2 mt-1 text-[12px] leading-relaxed text-muted">
                  {draft.body}
                </p>

                {draft.decision_note && (
                  <p className="mt-2.5 rounded-lg border border-border/70 bg-wash px-2.5 py-1.5 text-[11.5px] leading-relaxed text-muted italic">
                    “{draft.decision_note}”
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <CategoryBadge category={draft.category} />
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted transition-colors group-hover:text-ink">
                    Review
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {status === 'pending' && (
            <div className="flex items-center justify-center gap-2 pt-1 text-[11.5px] text-faint">
              <ShieldCheck className="h-3.5 w-3.5 text-teal/70" strokeWidth={1.75} />
              Nothing leaves Mailroom until you approve it.
            </div>
          )}
        </>
      )}
    </div>
  );
}
