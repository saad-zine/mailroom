import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CircleCheck,
  CircleDashed,
  KeyRound,
  Loader2,
  Mail,
  Play,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import { api, type Run, type SettingsInfo } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  IconTile,
  LoadingState,
  PageHeader,
  SectionHeader,
} from '../components/ui';
import { cn } from '../lib/utils';

const TERMINAL = new Set(['completed', 'failed', 'error', 'cancelled']);

export function Settings() {
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .settings()
      .then(setSettings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  const startRun = async () => {
    setRunning(true);
    setRunError(null);
    setRun(null);
    try {
      const created = await api.startRun();
      const poll = async (): Promise<boolean> => {
        try {
          const current = await api.getRun(created.run_id);
          setRun(current);
          const done = TERMINAL.has(current.status.toLowerCase());
          if (done) {
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
            setRunning(false);
          }
          return done;
        } catch (err) {
          if (pollRef.current !== null) window.clearInterval(pollRef.current);
          setRunning(false);
          setRunError(err instanceof Error ? err.message : 'Could not poll the run.');
          return true;
        }
      };
      const done = await poll();
      if (!done) {
        pollRef.current = window.setInterval(() => void poll(), 1500);
      }
    } catch (err) {
      setRunning(false);
      setRunError(err instanceof Error ? err.message : 'Could not start a run.');
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Settings" />
        <Card className="mt-5">
          <LoadingState label="Loading settings…" />
        </Card>
      </>
    );
  }
  if (error || !settings) {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Settings" />
        <Card className="mt-5">
          <ErrorState message={error ?? 'Could not load settings.'} onRetry={load} />
        </Card>
      </>
    );
  }

  const demo = settings.demo_mode;
  const runTone =
    run?.status.toLowerCase() === 'completed'
      ? 'success'
      : run?.status.toLowerCase() === 'failed' || run?.status.toLowerCase() === 'error'
        ? 'error'
        : 'warning';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="How Mailroom runs, what it runs on, and whether it can reach your inbox."
        actions={
          <Button
            variant="primary"
            onClick={() => void startRun()}
            disabled={running}
            loading={running}
          >
            {!running && <Play className="h-3.5 w-3.5" strokeWidth={2} />}
            {running ? 'Running…' : 'Run Mailroom'}
          </Button>
        }
      />

      {settings.setup_hint && (
        <Card className="border-warning/15 bg-tint-warning p-5">
          <div className="flex items-start gap-3">
            <IconTile tone="amber" size="md">
              <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
            </IconTile>
            <div>
              <h2 className="text-[13.5px] font-semibold text-ink">Setup needed</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-body">
                {settings.setup_hint}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Gmail connection status */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <IconTile
              tone={demo ? 'amber' : settings.gmail_connected ? 'green' : 'neutral'}
              size="lg"
            >
              <Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </IconTile>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  Gmail connection
                </h2>
                <Badge
                  tone={
                    demo ? 'warning' : settings.gmail_connected ? 'success' : 'neutral'
                  }
                  dot
                >
                  {demo
                    ? 'Demo mode'
                    : settings.gmail_connected
                      ? 'Connected'
                      : 'Not connected'}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
                {demo
                  ? 'Demo mode uses a seeded sample inbox — Gmail is never read or written. Switch MAILROOM_MODE to live in backend/.env to connect a real account.'
                  : settings.gmail_connected
                    ? 'Mailroom can read your inbox and create Gmail drafts for approved replies. It never sends mail on its own.'
                    : 'No Gmail account is connected yet. Add an OAuth client to the backend, then run Mailroom once to authorize your account.'}
              </p>
            </div>
          </div>
          {!demo && !settings.gmail_connected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void startRun()}
              disabled={running}
            >
              <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
              Authorize on next run
            </Button>
          )}
        </div>

        {demo ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-wash/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-muted">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={1.75} />
            Sample data only — approving a draft records the decision locally.
          </div>
        ) : settings.gmail_connected ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-success/15 bg-tint-success px-3.5 py-2.5 text-[11.5px] text-success">
              <CircleCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Approved replies become Gmail drafts
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-wash/60 px-3.5 py-2.5 text-[11.5px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={1.75} />
              Scope: gmail.modify · read and draft only
            </div>
          </div>
        ) : (
          <ol className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              {
                title: 'Create an OAuth client',
                detail: 'Google Cloud → Gmail API → OAuth client (Desktop app).',
              },
              {
                title: 'Add credentials.json',
                detail:
                  'Set GMAIL_CREDENTIALS_PATH in backend/.env, or drop the file in backend/.',
              },
              {
                title: 'Run once to sign in',
                detail:
                  'Click Run now — a browser window opens for Google sign-in, then the token is saved.',
              },
            ].map((step, index) => (
              <li key={step.title} className="rounded-xl border border-border bg-wash/50 p-3.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-paper text-[10px] font-semibold text-teal ring-1 ring-border tabular-nums">
                  {index + 1}
                </span>
                <p className="mt-2 text-[12px] font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        {/* Run panel */}
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={
              <IconTile tone="teal" size="sm">
                <Play className="h-4 w-4" strokeWidth={1.75} />
              </IconTile>
            }
            title="Run Mailroom"
            subtitle="Fetch new mail, categorize it, draft replies with RAG, and queue them for approval. Nothing is sent automatically."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => void startRun()}
                disabled={running}
                loading={running}
              >
                {!running && <Play className="h-3.5 w-3.5" strokeWidth={2} />}
                {running ? 'Running…' : 'Run now'}
              </Button>
            }
          />

          {runError && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-tint-error px-3 py-2 text-[11.5px] leading-relaxed text-error">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {runError}
            </p>
          )}

          {!run ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-wash/40 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-teal shadow-xs ring-1 ring-teal/15 ring-inset">
                <Play className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-ink">
                Ready when you are
              </p>
              <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">
                Start a run to fetch and draft. Each step appears here as Mailroom
                works through the inbox.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-wash/50 px-3.5 py-2.5">
                <Badge tone={runTone} dot>
                  {run.status}
                </Badge>
                <span className="font-mono text-[10.5px] text-faint">
                  {run.run_id}
                </span>
                {run.started_at && (
                  <span className="text-[10.5px] text-faint">
                    · started {formatDateTime(run.started_at)}
                  </span>
                )}
                {run.ended_at && (
                  <span className="text-[10.5px] text-faint">
                    · ended {formatDateTime(run.ended_at)}
                  </span>
                )}
              </div>

              {run.steps.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-wash px-3.5 py-3 text-[11.5px] text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" strokeWidth={2} />
                  Waiting for the first step…
                </p>
              ) : (
                <ol className="mt-4">
                  {[...run.steps]
                    .sort((a, b) => a.seq - b.seq)
                    .map((step, index, list) => (
                      <li key={step.seq} className="relative flex gap-3 pb-4 last:pb-0">
                        {index < list.length - 1 && (
                          <span className="absolute top-6 left-[9.5px] h-[calc(100%-14px)] w-px bg-border" />
                        )}
                        <StepIcon status={step.status} />
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[12.5px] font-medium text-ink">
                              {step.node}
                            </p>
                            <span className="rounded-full bg-neutral-tint px-1.5 py-0.5 text-[9.5px] font-medium tracking-wide text-faint uppercase">
                              {step.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                            {step.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              )}
            </div>
          )}
        </Card>

        {/* Connection + mode */}
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <SectionHeader
              icon={
                <IconTile tone="neutral" size="sm">
                  <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                </IconTile>
              }
              title="Connection"
              subtitle="What Mailroom is connected to right now."
            />
            <dl className="divide-y divide-border/70">
              <Row
                label="Mode"
                value={settings.mode}
                badge={settings.mode === 'mock' ? 'warning' : 'success'}
              />
              <Row label="Provider" value={settings.provider} />
              <Row label="Model" value={settings.model} mono />
              <Row
                label="LLM"
                value={settings.llm_available === false ? 'Not configured' : 'Available'}
                badge={settings.llm_available === false ? 'warning' : 'success'}
              />
              <Row
                label="RAG"
                value={
                  settings.vector_rag_available
                    ? 'Vector · Chroma + Gemini'
                    : 'Keyword · local KB'
                }
              />
              <Row
                label="Gmail"
                value={settings.gmail_connected ? 'Connected' : 'Not connected'}
                badge={settings.gmail_connected ? 'success' : 'neutral'}
              />
              <Row label="Version" value={settings.version} mono />
            </dl>
          </Card>

          <Card
            className={cn(
              'relative overflow-hidden p-5',
              demo
                ? 'border-warning/15 bg-gradient-to-br from-tint-warning via-white to-white'
                : 'border-teal/15 bg-gradient-to-br from-tint-teal via-white to-white',
            )}
          >
            <div
              className={cn(
                'pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl',
                demo ? 'bg-warning/10' : 'bg-teal/10',
              )}
            />
            <div className="relative flex items-center gap-2.5">
              <IconTile tone={demo ? 'amber' : 'teal'} size="sm">
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </IconTile>
              <h2 className="text-[13.5px] font-semibold text-ink">Approval policy</h2>
            </div>
            {demo ? (
              <p className="relative mt-2 text-[11.5px] leading-relaxed text-muted">
                Approved drafts are recorded locally. Nothing is sent to a real customer
                while demo mode is on.
              </p>
            ) : settings.gmail_connected ? (
              <p className="relative mt-2 text-[11.5px] leading-relaxed text-muted">
                Approved replies are created as Gmail drafts from the connected account.
                Mailroom never sends a message without your approval.
              </p>
            ) : (
              <p className="relative mt-2 text-[11.5px] leading-relaxed text-muted">
                Runs process local mail until Gmail is connected. Approvals are recorded
                locally — no message leaves the app.
              </p>
            )}
            <div className="relative mt-3 flex items-center gap-1.5 text-[10.5px] font-medium text-teal">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              Human approval required before send
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  badge,
  mono,
}: {
  label: string;
  value: string;
  badge?: 'success' | 'warning' | 'neutral';
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[11.5px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right">
        {badge ? (
          <Badge tone={badge} dot>
            {value}
          </Badge>
        ) : mono ? (
          <code className="inline-block max-w-full truncate rounded-md bg-wash px-1.5 py-0.5 font-mono text-[10.5px] text-body ring-1 ring-border">
            {value}
          </code>
        ) : (
          <span className="text-[12px] font-medium text-ink">{value}</span>
        )}
      </dd>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  const value = status.toLowerCase();
  if (value === 'completed' || value === 'done' || value === 'success') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-success ring-1 ring-success/15 ring-inset">
        <Check className="h-3 w-3 text-success" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === 'failed' || value === 'error') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-error ring-1 ring-error/15 ring-inset">
        <X className="h-3 w-3 text-error" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === 'running' || value === 'in_progress') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-teal ring-1 ring-teal/15 ring-inset">
        <Loader2 className="h-3 w-3 animate-spin text-teal" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === 'skipped' || value === 'warning') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-warning ring-1 ring-warning/15 ring-inset">
        <TriangleAlert className="h-3 w-3 text-warning" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-tint ring-1 ring-black/[0.04] ring-inset">
      <CircleDashed className="h-3 w-3 text-faint" strokeWidth={2} />
    </span>
  );
}
