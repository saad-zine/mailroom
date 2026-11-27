import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  ListChecks,
  Mail,
  Percent,
} from 'lucide-react';
import { api, type EmailItem, type Draft, type Stats } from '../lib/api';
import { formatRelativeTime, senderName } from '../lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  IconTile,
  LoadingState,
  PageHeader,
} from '../components/ui';

const CATEGORY_ORDER = [
  'product_enquiry',
  'customer_complaint',
  'customer_feedback',
  'unrelated',
] as const;

const CATEGORY_STYLE: Record<string, { label: string; color: string }> = {
  product_enquiry: { label: 'Product enquiry', color: '#0f7a6d' },
  customer_complaint: { label: 'Complaint', color: '#e11d48' },
  customer_feedback: { label: 'Feedback', color: '#2f5fd0' },
  unrelated: { label: 'Unrelated', color: '#a3a8b0' },
};

export function Dashboard({
  onOpenEmail,
  onGoInbox,
  onGoQueue,
}: {
  onOpenEmail: (id: string) => void;
  onGoInbox: () => void;
  onGoQueue: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<EmailItem[]>([]);
  const [pending, setPending] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.stats(), api.listEmails({ limit: 8 }), api.listDrafts('pending')])
      .then(([s, e, d]) => {
        setStats(s);
        setRecent(e.emails);
        setPending(d.drafts.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading…" />;
  if (error || !stats) return <ErrorState message={error ?? 'Could not load stats.'} onRetry={load} />;

  const totalForPct = Math.max(stats.total_emails, 1);
  const rate = stats.approval_rate ?? 0;
  const approvalPct = Math.round(rate > 1 ? rate : rate * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title="Inbox overview"
        description={
          stats.pending_drafts > 0
            ? `${stats.pending_drafts} draft${stats.pending_drafts === 1 ? '' : 's'} are waiting for your decision.`
            : 'No drafts are waiting for review.'
        }
        actions={
          <Button variant="primary" onClick={onGoQueue} disabled={stats.pending_drafts === 0}>
            Review queue
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Mail className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="neutral"
          label="Emails processed"
          value={String(stats.total_emails)}
          sub="All categories"
          onClick={onGoInbox}
        />
        <StatCard
          icon={<ListChecks className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="amber"
          label="Awaiting review"
          value={String(stats.pending_drafts)}
          sub={stats.pending_drafts > 0 ? 'Open the queue to decide' : 'Nothing pending'}
          onClick={onGoQueue}
        />
        <StatCard
          icon={<Percent className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="green"
          label="Approval rate"
          value={`${approvalPct}%`}
          sub={`${stats.approved} approved · ${stats.rejected} rejected`}
        />
        <StatCard
          icon={<Clock3 className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="blue"
          label="Avg. first response"
          value={
            stats.avg_first_response_min == null
              ? '—'
              : `${Math.round(stats.avg_first_response_min)} min`
          }
          sub="From receipt to draft"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  Waiting for review
                </h2>
                <p className="text-[12px] text-muted">Drafts paused for a human decision.</p>
              </div>
              <button
                type="button"
                onClick={onGoQueue}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-neutral-tint hover:text-ink"
              >
                View queue
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {pending.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                subtitle="New drafts will appear here once Mailroom processes the inbox."
                action={
                  <Button variant="secondary" size="sm" onClick={onGoInbox}>
                    Open inbox
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border/70">
                {pending.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => onOpenEmail(draft.email_id)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-wash/80"
                  >
                    <Avatar name={draft.sender} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {draft.subject}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                        <span className="truncate">{senderName(draft.sender)}</span>
                        <span className="text-faint">·</span>
                        <span className="shrink-0">{formatRelativeTime(draft.created_at)}</span>
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <CategoryBadge category={draft.category} />
                    </span>
                    <DraftStatusBadge status={draft.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
            Inbox by category
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">Where the conversation is coming from.</p>

          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-tint">
            {CATEGORY_ORDER.map((category) => {
              const count = stats.by_category[category] ?? 0;
              const pct = (count / totalForPct) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={category}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${pct}%`, background: CATEGORY_STYLE[category].color }}
                />
              );
            })}
          </div>

          <div className="mt-4 space-y-2.5">
            {CATEGORY_ORDER.map((category) => {
              const count = stats.by_category[category] ?? 0;
              const pct = Math.round((count / totalForPct) * 100);
              return (
                <div key={category} className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CATEGORY_STYLE[category].color }}
                  />
                  <span className="flex-1 truncate text-[12.5px] text-body">
                    {CATEGORY_STYLE[category].label}
                  </span>
                  <span className="text-[12px] font-medium text-ink tabular-nums">{count}</span>
                  <span className="w-9 text-right text-[11px] text-faint tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">Recent mail</h2>
            <p className="text-[12px] text-muted">The latest messages Mailroom has seen.</p>
          </div>
          <button
            type="button"
            onClick={onGoInbox}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-neutral-tint hover:text-ink"
          >
            View inbox
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState title="No emails yet" subtitle="Run Mailroom to fetch and process the inbox." />
        ) : (
          <div className="divide-y divide-border/70">
            {recent.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onOpenEmail(email.id)}
                className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-wash/80 md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto]"
              >
                <Avatar name={email.sender} size="md" />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12.5px] font-medium text-ink">
                      {senderName(email.sender)}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-faint md:hidden">
                      {formatRelativeTime(email.received_at)}
                    </span>
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">{email.subject}</span>
                </span>
                <span className="hidden md:block"><CategoryBadge category={email.category} /></span>
                <span className="hidden md:block">
                  {email.has_draft ? (
                    <Badge tone="teal" dot>Draft ready</Badge>
                  ) : (
                    <Badge dot={false}>No draft</Badge>
                  )}
                </span>
                <span className="hidden w-16 text-right text-[11px] text-faint md:block">
                  {formatRelativeTime(email.received_at)}
                </span>
                <ChevronRight className="h-4 w-4 text-faint" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  tone: 'teal' | 'amber' | 'blue' | 'rose' | 'green' | 'neutral' | 'ink';
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}) {
  const content = (
    <Card
      className={`p-4 sm:p-5 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-float' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <IconTile tone={tone} size="md">{icon}</IconTile>
      </div>
      <p className="mt-4 text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-body">{label}</p>
      {sub && <p className="mt-2 border-t border-border/70 pt-2 text-[11px] text-faint">{sub}</p>}
    </Card>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="cursor-pointer text-left">
      {content}
    </button>
  ) : (
    content
  );
}
