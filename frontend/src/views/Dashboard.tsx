import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Inbox as InboxIcon,
  ListChecks,
  Mail,
  Percent,
  ShieldCheck,
  Sparkles,
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

  if (loading) return <LoadingState label="Loading your workspace…" />;
  if (error || !stats) {
    return <ErrorState message={error ?? 'Could not load stats.'} onRetry={load} />;
  }

  const total = stats.total_emails;
  const totalForPct = Math.max(total, 1);
  const rate = stats.approval_rate ?? 0;
  const approvalPct = Math.round(rate > 1 ? rate : rate * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title={`Good ${greeting()}, let's get started.`}
        description="Mailroom has read your support mail, sorted it, and drafted replies. Review them before anything leaves the room."
        actions={
          <>
            <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 text-[12px] font-medium text-muted shadow-xs sm:inline-flex">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
              Last 30 days
            </span>
            <Button
              variant="primary"
              onClick={stats.pending_drafts > 0 ? onGoQueue : onGoInbox}
            >
              {stats.pending_drafts > 0
                ? `Review ${stats.pending_drafts} draft${stats.pending_drafts === 1 ? '' : 's'}`
                : 'Open inbox'}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </>
        }
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-black/40 bg-ink p-0 text-white shadow-float">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-teal/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/75">
              <Sparkles className="h-3 w-3 text-emerald-300" strokeWidth={2} />
              Human in the loop
            </span>
            <h2 className="text-balance mt-4 max-w-[440px] text-[23px] leading-[1.2] font-semibold tracking-[-0.025em] sm:text-[26px]">
              Your inbox, drafted and ready for review.
            </h2>
            <p className="mt-2.5 max-w-[440px] text-[13px] leading-relaxed text-white/55">
              Mailroom reads, categorizes, and writes a grounded reply for every
              customer email. You decide what goes out — and what doesn&apos;t.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={onGoQueue}>
                <ListChecks className="h-3.5 w-3.5" strokeWidth={1.75} />
                Review queue
              </Button>
              <button
                type="button"
                onClick={onGoInbox}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/[0.07] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.13] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
              >
                Browse inbox
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ApprovalRing
              approved={stats.approved}
              rejected={stats.rejected}
              pending={stats.pending_drafts}
              rate={approvalPct}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Mail className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="neutral"
          label="Emails processed"
          value={String(stats.total_emails)}
          sub="Across every category"
        />
        <StatCard
          icon={<ListChecks className="h-[17px] w-[17px]" strokeWidth={1.75} />}
          tone="amber"
          label="Awaiting review"
          value={String(stats.pending_drafts)}
          sub={stats.pending_drafts > 0 ? 'Needs your decision' : 'Queue is clear'}
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

      {/* Queue + insight */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile tone="amber" size="sm">
                  <ListChecks className="h-4 w-4" strokeWidth={1.75} />
                </IconTile>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                    Waiting for review
                  </h2>
                  <p className="text-[12px] text-muted">
                    Drafts paused for a human decision.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoQueue}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-neutral-tint hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
              >
                View queue
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {pending.length === 0 ? (
              <EmptyState
                art="queue"
                title="Queue is clear"
                subtitle="No drafts are waiting for review. New mail will appear here as soon as Mailroom writes a reply."
                action={
                  <Button variant="secondary" size="sm" onClick={onGoInbox}>
                    Browse the inbox
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
                    className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-wash/80 focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:ring-inset focus-visible:outline-none"
                  >
                    <Avatar name={draft.sender} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {draft.subject}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                        <span className="truncate">{senderName(draft.sender)}</span>
                        <span className="text-faint">·</span>
                        <span className="shrink-0">
                          {formatRelativeTime(draft.created_at)}
                        </span>
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <CategoryBadge category={draft.category} />
                    </span>
                    <DraftStatusBadge status={draft.status} />
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted"
                      strokeWidth={1.75}
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  Inbox by category
                </h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  Where the conversation is coming from.
                </p>
              </div>
              <span className="rounded-full bg-neutral-tint px-2 py-0.5 text-[10.5px] font-medium text-muted tabular-nums">
                {total} total
              </span>
            </div>

            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-tint">
              {CATEGORY_ORDER.map((category) => {
                const count = stats.by_category[category] ?? 0;
                const pct = (count / totalForPct) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={category}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${pct}%`,
                      background: CATEGORY_STYLE[category].color,
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-4 space-y-2.5">
              {CATEGORY_ORDER.map((category) => {
                const count = stats.by_category[category] ?? 0;
                const pct = Math.round((count / totalForPct) * 100);
                const meta = CATEGORY_STYLE[category];
                return (
                  <div key={category} className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: meta.color }}
                    />
                    <span className="flex-1 truncate text-[12.5px] text-body">
                      {meta.label}
                    </span>
                    <span className="text-[12px] font-medium text-ink tabular-nums">
                      {count}
                    </span>
                    <span className="w-9 text-right text-[11px] text-faint tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="relative overflow-hidden border-teal/15 bg-gradient-to-br from-tint-teal via-white to-white p-5">
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-teal/10 blur-2xl" />
            <IconTile tone="teal" size="sm">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            </IconTile>
            <h3 className="relative mt-3 text-[14px] font-semibold tracking-[-0.01em] text-ink">
              Nothing sends without you.
            </h3>
            <p className="relative mt-1 text-[12px] leading-relaxed text-muted">
              Approving a draft is the last step. Mailroom never replies on its own.
            </p>
            <ul className="relative mt-3.5 space-y-1.5">
              {[
                'Categorized before it reaches you',
                'Grounded in your own documents',
                'Sent only after a human approves',
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 text-[11.5px] text-body"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Recent mail */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile tone="neutral" size="sm">
              <InboxIcon className="h-4 w-4" strokeWidth={1.75} />
            </IconTile>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                Recent mail
              </h2>
              <p className="text-[12px] text-muted">The latest messages Mailroom has seen.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoInbox}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-neutral-tint hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
          >
            View inbox
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            art="mail"
            title="No emails yet"
            subtitle="Run Mailroom to fetch and process your inbox."
          />
        ) : (
          <div className="divide-y divide-border/70">
            {recent.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onOpenEmail(email.id)}
                className="group grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-wash/80 focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:ring-inset focus-visible:outline-none md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto]"
              >
                <Avatar name={email.sender} size="md" />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12.5px] font-medium text-ink">
                      {senderName(email.sender)}
                    </span>
                    <span className="text-[10px] text-faint">·</span>
                    <span className="shrink-0 text-[10.5px] text-faint md:hidden">
                      {formatRelativeTime(email.received_at)}
                    </span>
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {email.subject}
                  </span>
                </span>
                <span className="hidden md:block">
                  <CategoryBadge category={email.category} />
                </span>
                <span className="hidden md:block">
                  {email.has_draft ? (
                    <Badge tone="teal" dot>
                      Draft ready
                    </Badge>
                  ) : (
                    <Badge dot={false}>No draft</Badge>
                  )}
                </span>
                <span className="hidden w-16 text-right text-[11px] text-faint md:block">
                  {formatRelativeTime(email.received_at)}
                </span>
                <ChevronRight
                  className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted"
                  strokeWidth={1.75}
                />
              </button>
            ))}
          </div>
        )}
      </Card>
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
}: {
  icon: React.ReactNode;
  tone: 'teal' | 'amber' | 'blue' | 'rose' | 'green' | 'neutral' | 'ink';
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <IconTile tone={tone} size="md">
          {icon}
        </IconTile>
      </div>
      <p className="mt-4 text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-body">{label}</p>
      {sub && (
        <p className="mt-2 border-t border-border/70 pt-2 text-[11px] text-faint">
          {sub}
        </p>
      )}
    </Card>
  );
}

function ApprovalRing({
  approved,
  rejected,
  pending,
  rate,
}: {
  approved: number;
  rejected: number;
  pending: number;
  rate: number;
}) {
  const total = approved + rejected + pending;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: approved, color: '#34d399', label: 'Approved' },
    { value: rejected, color: '#fb7185', label: 'Rejected' },
    { value: pending, color: '#fbbf24', label: 'Pending' },
  ].filter((segment) => segment.value > 0);

  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[158px] w-[158px] shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = `${Math.max(length - 4, 1)} ${circumference}`;
              const element = (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[29px] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">
            {rate}%
          </span>
          <span className="mt-1 text-[9.5px] font-medium tracking-[0.14em] text-white/40 uppercase">
            Approval
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        {segments.length === 0 ? (
          <p className="max-w-[120px] text-[11.5px] leading-relaxed text-white/45">
            No decisions yet.
          </p>
        ) : (
          segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: segment.color }}
              />
              <span className="w-16 text-[11.5px] text-white/55">
                {segment.label}
              </span>
              <span className="text-[12px] font-medium text-white tabular-nums">
                {segment.value}
              </span>
            </div>
          ))
        )}
        <p className="pt-0.5 text-[10px] text-white/30 tabular-nums">
          {total} draft{total === 1 ? '' : 's'} in this period
        </p>
      </div>
    </div>
  );
}
