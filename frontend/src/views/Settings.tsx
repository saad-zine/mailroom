import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CircleDashed,
  Loader2,
  Play,
  TriangleAlert,
  X,
} from 'lucide-react';
import { api, type GmailStatus, type Me, type Run, type SettingsInfo } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
} from '../components/ui';

const TERMINAL = new Set(['completed', 'failed', 'error', 'cancelled']);

export function Settings({
  onSignOut,
  signedIn,
}: {
  onSignOut: () => void | Promise<void>;
  signedIn: boolean;
}) {
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.settings(), api.me(), api.gmailStatus()])
      .then(([s, m, g]) => {
        setSettings(s);
        setMe(m);
        setGmail(g);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const { url } = await api.gmailConnect();
      window.location.href = url;
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Could not start Gmail connection.');
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    setConnecting(true);
    try {
      await api.gmailDisconnect();
      setGmail(await api.gmailStatus());
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Could not disconnect Gmail.');
    } finally {
      setConnecting(false);
    }
  };

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
      if (!done) pollRef.current = window.setInterval(() => void poll(), 1500);
    } catch (err) {
      setRunning(false);
      setRunError(err instanceof Error ? err.message : 'Could not start a run.');
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Account" title="Settings" />
        <Card className="mt-5"><LoadingState label="Loading…" /></Card>
      </>
    );
  }
  if (error || !settings) {
    return (
      <>
        <PageHeader eyebrow="Account" title="Settings" />
        <Card className="mt-5"><ErrorState message={error ?? 'Could not load settings.'} onRetry={load} /></Card>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Connect a Gmail account, then run Mailroom to draft replies for new mail."
        actions={
          <>
            {signedIn && (
              <Button variant="secondary" onClick={() => void onSignOut()}>
                Sign out
              </Button>
            )}
            <Button variant="primary" onClick={() => void startRun()} disabled={running} loading={running}>
              {!running && <Play className="h-3.5 w-3.5" strokeWidth={2} />}
              {running ? 'Running…' : 'Run now'}
            </Button>
          </>
        }
      />

      {settings.setup_hint && (
        <Card className="border-warning/15 bg-tint-warning p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
            <p className="text-[12px] leading-relaxed text-body">{settings.setup_hint}</p>
          </div>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Gmail connection" subtitle="Mailroom reads mail and creates drafts in this account. It never sends without your approval." />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-wash/50 px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-ink">
                {gmail?.connected ? gmail.email : 'No account connected'}
              </span>
              <Badge tone={gmail?.connected ? 'success' : 'neutral'} dot>
                {gmail?.connected ? 'Connected' : 'Not connected'}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {gmail?.connected
                ? `Last synced ${gmail.last_sync_at ? formatDateTime(gmail.last_sync_at) : 'never'}`
                : 'Connect an account to process real mail.'}
            </p>
          </div>
          {gmail?.connected ? (
            <Button variant="secondary" size="sm" onClick={disconnectGmail} loading={connecting} disabled={connecting}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={connectGmail} loading={connecting} disabled={connecting}>
              Connect Gmail
            </Button>
          )}
        </div>

        {me && (
          <p className="mt-3 text-[11px] text-faint">
            Signed in as {me.email ?? me.id} · workspace {me.workspace_id}
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Run Mailroom"
          subtitle="Fetch new mail, draft replies, and queue them for approval."
          action={
            <Button variant="primary" size="sm" onClick={() => void startRun()} disabled={running} loading={running}>
              {!running && <Play className="h-3.5 w-3.5" strokeWidth={2} />}
              {running ? 'Running…' : 'Run now'}
            </Button>
          }
        />

        {runError && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-tint-error px-3 py-2 text-[11.5px] text-error">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {runError}
          </p>
        )}

        {!run ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-wash/40 px-6 py-9 text-center">
            <p className="text-[13px] font-semibold text-ink">No run yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[11.5px] text-muted">
              Start a run to process the inbox. Each step appears here as it happens.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-wash/50 px-3.5 py-2.5">
              <Badge
                tone={
                  run.status.toLowerCase() === 'completed'
                    ? 'success'
                    : run.status.toLowerCase() === 'failed' || run.status.toLowerCase() === 'error'
                      ? 'error'
                      : 'warning'
                }
                dot
              >
                {run.status}
              </Badge>
              <span className="font-mono text-[10.5px] text-faint">Run {run.run_id}</span>
              {run.ended_at && (
                <span className="text-[10.5px] text-faint">· ended {formatDateTime(run.ended_at)}</span>
              )}
            </div>
            {run.steps.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-wash px-3.5 py-3 text-[11.5px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" strokeWidth={2} />
                Waiting for the first step…
              </p>
            ) : (
              <ol className="mt-4">
                {[...run.steps].sort((a, b) => a.seq - b.seq).map((step) => (
                  <li key={step.seq} className="flex gap-3 pb-4 last:pb-0">
                    <StepIcon status={step.status} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[12.5px] font-medium text-ink">{step.node}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Card>
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
