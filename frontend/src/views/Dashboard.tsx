import { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, Inbox as InboxIcon, Mail, Percent } from 'lucide-react';
import { api, type EmailItem, type Draft, type Stats } from '../lib/api';
import { formatRelativeTime, initials, senderName } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '../components/ui';

const CATEGORY_ORDER = [
  'product_enquiry',
  'customer_complaint',
  'customer_feedback',
  'unrelated',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  product_enquiry: 'Product enquiry',
  customer_complaint: 'Complaint',
  customer_feedback: 'Feedback',
  unrelated: 'Unrelated',
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
    Promise.all([
      api.stats(),
      api.listEmails({ limit: 8 }),
      api.listDrafts('pending'),
    ])
      .then(([s, e, d]) => {
        setStats(s);
        setRecent(e.emails);
        setPending(d.drafts.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error || !stats) return <ErrorState message={error ?? 'Could not load stats.'} onRetry={load} />;

  const total = stats.total_emails || 1;
  const approvalPct = Math.round(
    (stats.approval_rate ?? 0) > 1 ? (stats.approval_rate ?? 0) : (stats.approval_rate ?? 0) * 100,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-teal">Workspace overview</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-[34px]">
            Good {greeting()}, here&apos;s your inbox.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            A clear view of your team&apos;s incoming mail, draft replies, and approval workload.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-border bg-paper px-3.5 py-2 text-xs font-medium text-muted shadow-sm sm:flex">
          <span className="size-2 rounded-full bg-teal" aria-hidden="true" />
          Human review enabled
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={<Mail className="size-5" strokeWidth={1.8} />}
          tone="info"
          label="Total emails"
          value={String(stats.total_emails)}
        />
        <StatCard
          icon={<CheckSquare className="size-5" strokeWidth={1.8} />}
          tone="warning"
          label="Pending drafts"
          value={String(stats.pending_drafts)}
          accent={stats.pending_drafts > 0}
        />
        <StatCard
          icon={<Percent className="size-5" strokeWidth={1.8} />}
          tone="success"
          label="Approval rate"
          value={`${approvalPct}%`}
          sub={`${stats.approved} approved · ${stats.rejected} rejected`}
        />
        <StatCard
          icon={<InboxIcon className="size-5" strokeWidth={1.8} />}
          tone="teal"
          label="Avg. first response"
          value={
            stats.avg_first_response_min == null
              ? '—'
              : `${Math.round(stats.avg_first_response_min)} min`
          }
        />
      </div>

      {/* Category breakdown */}
      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="By category"
          subtitle="How the inbox breaks down across the four categories."
        />
        <div className="space-y-3">
          {CATEGORY_ORDER.map((cat) => {
            const count = stats.by_category[cat] ?? 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-[13px] text-body">
                  {CATEGORY_LABELS[cat]}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-tint">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[13px] text-muted">
                  {count} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending queue preview */}
      <div>
        <SectionHeader
          title="Pending approval"
          subtitle="Drafts waiting for a human decision. Nothing is sent until you approve it."
          action={
            <Button variant="ghost" size="sm" onClick={onGoQueue}>
              View queue
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          }
        />
        {pending.length === 0 ? (
          <Card>
            <EmptyState
              title="Queue is clear"
              subtitle="No drafts are waiting for review right now."
              action={
                <Button variant="secondary" size="sm" onClick={onGoInbox}>
                  Browse the inbox
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {pending.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onOpenEmail(d.email_id)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                  {initials(d.sender)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {d.subject}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {senderName(d.sender)} · {formatRelativeTime(d.created_at)}
                  </span>
                </span>
                <CategoryBadge category={d.category} />
                <DraftStatusBadge status={d.status} />
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Recent emails */}
      <div>
        <SectionHeader
          title="Recent emails"
          subtitle="The latest mail Mailroom has seen."
          action={
            <Button variant="ghost" size="sm" onClick={onGoInbox}>
              View all
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          }
        />
        {recent.length === 0 ? (
          <Card>
            <EmptyState
              title="No emails yet"
              subtitle="Run Mailroom to fetch and process your inbox."
            />
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {recent.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEmail(e.id)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                  {initials(e.sender)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {e.subject}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {senderName(e.sender)} — {e.snippet}
                  </span>
                </span>
                <CategoryBadge category={e.category} />
                {e.has_draft ? (
                  <Badge tone="teal">Draft ready</Badge>
                ) : (
                  <Badge tone="neutral">No draft</Badge>
                )}
                <span className="w-16 shrink-0 text-right text-xs text-faint">
                  {formatRelativeTime(e.received_at)}
                </span>
              </button>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  tone: 'info' | 'warning' | 'success' | 'teal';
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  const toneStyles = {
    info: 'bg-tint-info text-info',
    warning: 'bg-tint-warning text-warning',
    success: 'bg-tint-success text-success',
    teal: 'bg-tint-teal text-teal',
  };

  return (
    <Card className="p-4 transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[12px] font-semibold tracking-[0.01em] text-muted">{label}</p>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.05em] text-ink tabular-nums">{value}</p>
      <div className="mt-2 min-h-5 text-xs text-muted">
        {sub ?? (accent ? <span className="font-semibold text-warning">Needs your review</span> : null)}
      </div>
    </Card>
  );
}
