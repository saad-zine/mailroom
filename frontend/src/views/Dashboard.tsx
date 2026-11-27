import { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, Inbox as InboxIcon, Mail, Percent } from 'lucide-react';
import { Bot } from '../components/Bot';
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

  const total = stats?.total_emails || 1;
  const approvalPct = Math.round(
    (stats?.approval_rate ?? 0) > 1 ? (stats?.approval_rate ?? 0) : (stats?.approval_rate ?? 0) * 100,
  );

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR INBOX, UNDER CONTROL <span className="eyebrow-number">/ 01</span></div>
          <h1>Good {greeting()},<br />let’s make <Bot /> <span>room.</span></h1>
          <p>Less time in your inbox. More time for the work that matters. Mailroom drafts replies; you decide what goes out.</p>
          <div className="hero-actions">
            <Button variant="primary" size="lg" onClick={onGoQueue}>Review drafts <ArrowRight className="h-4 w-4" /></Button>
            <Button variant="secondary" size="lg" onClick={onGoInbox}>Open inbox</Button>
          </div>
        </div>
        <div className="hero-aside" aria-hidden="true">
          <span className="hero-aside-label">A LITTLE MORE<br />SPACE TO THINK.</span>
          <div className="hero-envelope"><span>✳</span><Mail size={52} strokeWidth={1.2} /></div>
          <span className="hero-aside-bottom">MADE FOR BETTER WORK <span>↗</span></span>
        </div>
      </section>
      <div className="dashboard-section-title"><div><span className="section-kicker">THE BIG PICTURE</span><h2>At a glance<span>.</span></h2></div><span className="section-number">01 — OVERVIEW</span></div>
      {loading ? <Card><LoadingState label="Loading dashboard…" /></Card> : error || !stats ? <Card><ErrorState message={error ?? 'Could not load stats.'} onRetry={load} /></Card> : <>
      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard
          icon={<Mail className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />}
          label="Total emails"
          value={String(stats.total_emails)}
        />
        <StatCard
          icon={<CheckSquare className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />}
          label="Pending drafts"
          value={String(stats.pending_drafts)}
          accent={stats.pending_drafts > 0}
        />
        <StatCard
          icon={<Percent className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />}
          label="Approval rate"
          value={`${approvalPct}%`}
          sub={`${stats.approved} approved · ${stats.rejected} rejected`}
        />
        <StatCard
          icon={<InboxIcon className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />}
          label="Avg. first response"
          value={
            stats.avg_first_response_min == null
              ? '—'
              : `${Math.round(stats.avg_first_response_min)} min`
          }
        />
      </div>

      {/* Category breakdown */}
      <Card className="category-card p-5">
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
                <div className="h-2 flex-1 overflow-hidden bg-neutral-tint">
                  <div
                    className="h-full bg-teal transition-all duration-300"
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
          <Card className="divide-y divide-[#f3f4f6]">
            {pending.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onOpenEmail(d.email_id)}
                className="mail-row flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
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
          <Card className="divide-y divide-[#f3f4f6]">
            {recent.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEmail(e.id)}
                className="mail-row flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
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
      </>}
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
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="stat-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        {icon}
      </div>
      <p className="stat-value">{value}</p>
      {sub ? (
        <p className="mt-2 text-xs text-muted">{sub}</p>
      ) : accent ? (
        <p className="mt-2 text-xs font-medium text-warning">Needs your review</p>
      ) : (
        <p className="mt-2 text-xs text-faint">&nbsp;</p>
      )}
    </Card>
  );
}
