import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CircleDashed,
  Loader2,
  Mail,
  Play,
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
  LoadingState,
  SectionHeader,
} from '../components/ui';

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
      <Card>
        <LoadingState label="Loading settings…" />
      </Card>
    );
  }
  if (error || !settings) {
    return (
      <Card>
        <ErrorState message={error ?? 'Could not load settings.'} onRetry={load} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Settings</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          How Mailroom runs, what it runs on, and whether it can reach your inbox.
        </p>
      </div>

      {/* Setup needed — live mode without its API key */}
      {settings.setup_hint && (
        <Card className="border border-border bg-tint-warning p-6">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warning" strokeWidth={1.5} />
            <div>
              <h2 className="text-base font-semibold text-ink">Setup needed</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {settings.setup_hint}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Run now */}
      <Card className="p-6">
        <SectionHeader
          title="Run Mailroom now"
          subtitle="Fetch new mail from the inbox, categorize it, draft replies with RAG, and queue them for your approval. Nothing is sent automatically."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={() => void startRun()} disabled={running} loading={running}>
            <Play className="h-4 w-4" strokeWidth={1.5} />
            {running ? 'Running…' : 'Run now'}
          </Button>
          {run && (
            <Badge tone={run.status.toLowerCase() === 'completed' ? 'success' : run.status.toLowerCase() === 'failed' || run.status.toLowerCase() === 'error' ? 'error' : 'warning'}>
              {run.status}
            </Badge>
          )}
        </div>

        {runError && (
          <p className="mt-4 rounded-lg bg-tint-error px-3 py-2 text-[13px] text-error">
            {runError}
          </p>
        )}

        {run && (
          <div className="mt-5">
            <p className="mb-2 font-mono text-xs text-muted">
              Run {run.run_id}
              {run.started_at ? ` · started ${formatDateTime(run.started_at)}` : ''}
              {run.ended_at ? ` · ended ${formatDateTime(run.ended_at)}` : ''}
            </p>
            {run.steps.length === 0 ? (
              <p className="rounded-lg bg-wash px-4 py-3 text-[13px] text-muted">
                Waiting for the first step…
              </p>
            ) : (
              <ol className="space-y-2">
                {[...run.steps]
                  .sort((a, b) => a.seq - b.seq)
                  .map((step) => (
                    <li
                      key={step.seq}
                      className="flex items-start gap-3 rounded-lg border border-border bg-wash px-4 py-3"
                    >
                      <StepIcon status={step.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{step.node}</p>
                        <p className="text-[13px] leading-relaxed text-muted">
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

      {/* Connection */}
      <Card className="p-6">
        <SectionHeader
          title="Connection"
          subtitle="What Mailroom is connected to right now."
        />
        <dl className="divide-y divide-[#f3f4f6]">
          <Row label="Mode" value={settings.mode} badge={settings.mode === 'mock' ? 'warning' : 'success'} />
          <Row label="Provider" value={settings.provider} />
          <Row label="Model" value={settings.model} mono />
          <Row
            label="LLM"
            value={settings.llm_available === false ? 'Not configured' : 'Available'}
            badge={settings.llm_available === false ? 'warning' : 'success'}
          />
          <Row
            label="RAG"
            value={settings.vector_rag_available ? 'Vector (Chroma + Gemini)' : 'Keyword (local KB)'}
          />
          <Row
            label="Gmail"
            value={settings.gmail_connected ? 'Connected' : 'Not connected'}
            badge={settings.gmail_connected ? 'success' : 'neutral'}
          />
          <Row label="Version" value={settings.version} mono />
        </dl>
      </Card>

      {/* Demo mode explanation */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-semibold text-ink">
              {settings.demo_mode ? 'Demo mode is on' : 'Live mode'}
            </h2>
            {settings.demo_mode ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Mailroom is running on demo data — no real Gmail account is connected,
                so the inbox, drafts, and stats you see are sample data. To process
                your real inbox, connect Gmail: the backend needs a Gmail OAuth
                connection (gmail.modify scope). Until then, every run processes the
                demo mailbox, and approving a draft only marks it approved — nothing
                is sent to a real customer.
              </p>
            ) : settings.gmail_connected ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Mailroom is connected to a real Gmail inbox. Runs fetch real mail,
                drafts are queued for your approval, and approved drafts are created
                as Gmail drafts from the connected account. Nothing is ever sent
                without your approval.
              </p>
            ) : (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Mailroom is running live, but no Gmail account is connected yet, so
                the inbox starts empty. Connect Gmail (see the setup note above) to
                process your real inbox. Until then, runs process whatever mail is
                already in the local inbox.
              </p>
            )}
          </div>
        </div>
      </Card>
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
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>
        {badge ? (
          <Badge tone={badge}>{value}</Badge>
        ) : (
          <span className={mono ? 'font-mono text-[13px] text-ink' : 'text-sm text-ink'}>
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'done' || s === 'success') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-success">
        <Check className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
      </span>
    );
  }
  if (s === 'failed' || s === 'error') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint-error">
        <X className="h-3.5 w-3.5 text-error" strokeWidth={1.5} />
      </span>
    );
  }
  if (s === 'running' || s === 'in_progress') {
    return <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-teal" strokeWidth={1.5} />;
  }
  if (s === 'skipped' || s === 'warning') {
    return (
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" strokeWidth={1.5} />
    );
  }
  return (
    <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-faint" strokeWidth={1.5} />
  );
}
