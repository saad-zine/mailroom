import { useEffect, useState } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { BookOpenTextIcon } from '@phosphor-icons/react/dist/csr/BookOpenText';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { PercentIcon } from '@phosphor-icons/react/dist/csr/Percent';
import { TrayIcon } from '@phosphor-icons/react/dist/csr/Tray';
import { api, type EmailItem, type Draft, type Stats } from '../lib/api';
import { formatRelativeTime, initials, senderName } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  DraftStatusBadge,
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
  onGoKnowledgeBase,
  onGoSettings,
}: {
  onOpenEmail: (id: string) => void;
  onGoInbox: () => void;
  onGoQueue: () => void;
  onGoKnowledgeBase: () => void;
  onGoSettings: () => void;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            Good {greeting()}, let&apos;s get started.
          </h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening in your support inbox.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        <StatCard
          icon={<EnvelopeSimpleIcon size={16} weight="regular" aria-hidden="true" />}
          label="Total emails"
          value={String(stats.total_emails)}
        />
        <StatCard
          icon={<ClipboardTextIcon size={16} weight="regular" aria-hidden="true" />}
          label="Pending drafts"
          value={String(stats.pending_drafts)}
          accent={stats.pending_drafts > 0}
        />
        <StatCard
          icon={<PercentIcon size={16} weight="regular" aria-hidden="true" />}
          label="Approval rate"
          value={`${approvalPct}%`}
          sub={`${stats.approved} approved · ${stats.rejected} rejected`}
        />
        <StatCard
          icon={<TrayIcon size={16} weight="regular" aria-hidden="true" />}
          label="Avg. first response"
          value={
            stats.avg_first_response_min == null
              ? '—'
              : `${Math.round(stats.avg_first_response_min)} min`
          }
        />
      </div>

      {stats.total_emails === 0 ? (
        <section className="space-y-3" aria-label="Get started">
          <SectionHeader title="Get started" />
          <div className="grid gap-3 md:grid-cols-3">
            <QuickActionCard
              icon={<TrayIcon size={20} weight="regular" aria-hidden="true" />}
              title="Start with your inbox"
              description="Browse and filter incoming support messages."
              action="Open inbox"
              onClick={onGoInbox}
            />
            <QuickActionCard
              icon={<BookOpenTextIcon size={20} weight="regular" aria-hidden="true" />}
              title="Add reply guidance"
              description="Upload product details, policies, and support notes."
              action="Add guidance"
              onClick={onGoKnowledgeBase}
            />
            <QuickActionCard
              icon={<GearSixIcon size={20} weight="regular" aria-hidden="true" />}
              title="Review connections"
              description="Check your AI provider and Gmail connection status."
              action="View settings"
              onClick={onGoSettings}
            />
          </div>
        </section>
      ) : (
        <Card className="p-5 sm:p-6">
          <SectionHeader title="Email categories" />
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
      )}

      {pending.length > 0 && (
        <div>
          <SectionHeader
            title="Pending approval"
            action={
              <Button variant="ghost" size="sm" onClick={onGoQueue}>
                View queue
                <ArrowRightIcon size={16} weight="regular" aria-hidden="true" />
              </Button>
            }
          />
          <Card className="divide-y divide-border">
            {pending.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onOpenEmail(draft.email_id)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                  {initials(draft.sender)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {draft.subject}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {senderName(draft.sender)} · {formatRelativeTime(draft.created_at)}
                  </span>
                </span>
                <CategoryBadge category={draft.category} />
                <DraftStatusBadge status={draft.status} />
              </button>
            ))}
          </Card>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <SectionHeader
            title="Recent emails"
            action={
              <Button variant="ghost" size="sm" onClick={onGoInbox}>
                View all
                <ArrowRightIcon size={16} weight="regular" aria-hidden="true" />
              </Button>
            }
          />
          <Card className="divide-y divide-border">
            {recent.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onOpenEmail(email.id)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
                  {initials(email.sender)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {email.subject}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {senderName(email.sender)} — {email.snippet}
                  </span>
                </span>
                <CategoryBadge category={email.category} />
                {email.has_draft ? (
                  <Badge tone="teal">Draft ready</Badge>
                ) : (
                  <Badge tone="neutral">No draft</Badge>
                )}
                <span className="w-16 shrink-0 text-right text-xs text-faint">
                  {formatRelativeTime(email.received_at)}
                </span>
              </button>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function QuickActionCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card className="flex min-h-[176px] flex-col p-4 sm:p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-neutral-tint text-body">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{description}</p>
      <Button variant="secondary" size="sm" onClick={onClick} className="mt-4 self-start">
        {action}
        <ArrowRightIcon size={16} weight="regular" aria-hidden="true" />
      </Button>
    </Card>
  );
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
    <div className="min-h-[112px] bg-paper px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <p className="text-[11px] font-medium tracking-[0.01em] sm:text-xs">{label}</p>
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">{value}</p>
      <p className="mt-1 min-h-4 text-[11px] leading-relaxed text-muted">
        {sub ?? (accent ? <span className="font-medium text-warning">Needs review</span> : null)}
      </p>
    </div>
  );
}
