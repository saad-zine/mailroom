import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CircleCheck,
  FileText,
  Mail,
  MessageSquareQuote,
  Play,
  Save,
  Wand2,
  X,
} from 'lucide-react';
import { api, ApiError, type Draft, type EmailItem, type RagChunk } from '../lib/api';
import { formatDateTime, senderName } from '../lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CATEGORY_META,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  IconTile,
  LoadingState,
  Modal,
  SectionHeader,
} from '../components/ui';

export function EmailDetail({
  emailId,
  onBack,
  onGoSettings,
  onDecided,
}: {
  emailId: string;
  onBack: () => void;
  onGoSettings: () => void;
  onDecided: () => void;
}) {
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rag, setRag] = useState<RagChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [body, setBody] = useState('');
  const [bodyDirty, setBodyDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getEmail(emailId)
      .then((res) => {
        setEmail(res.email);
        setDraft(res.draft);
        setRag(res.rag_context ?? []);
        setBody(res.draft?.body ?? '');
        setBodyDirty(false);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [emailId]);

  if (loading) {
    return (
      <DetailShell onBack={onBack}>
        <Card>
          <LoadingState label="Opening the email…" />
        </Card>
      </DetailShell>
    );
  }
  if (error || !email) {
    return (
      <DetailShell onBack={onBack}>
        <Card>
          <ErrorState message={error ?? 'Email not found.'} onRetry={load} />
        </Card>
      </DetailShell>
    );
  }

  const decided = draft !== null && draft.status !== 'pending';

  const saveEdits = async () => {
    if (!draft) return;
    setSaving(true);
    setActionError(null);
    setActionOk(null);
    try {
      const updated = await api.updateDraft(draft.id, body);
      setDraft(updated);
      setBody(updated.body);
      setBodyDirty(false);
      setActionOk('Draft saved.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the draft.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!draft) return;
    setDeciding(true);
    setActionError(null);
    setActionOk(null);
    try {
      const updated = await api.approveDraft(draft.id);
      setDraft(updated);
      setActionOk('Draft approved. It can now be sent.');
      onDecided();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError('This draft was already decided. Reloading its latest state.');
        load();
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not approve the draft.');
      }
    } finally {
      setDeciding(false);
    }
  };

  const reject = async () => {
    if (!draft || !rejectReason.trim()) return;
    setDeciding(true);
    setActionError(null);
    setActionOk(null);
    try {
      const updated = await api.rejectDraft(draft.id, rejectReason.trim());
      setDraft(updated);
      setShowReject(false);
      setRejectReason('');
      setActionOk('Draft rejected.');
      onDecided();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError('This draft was already decided. Reloading its latest state.');
        setShowReject(false);
        load();
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not reject the draft.');
      }
    } finally {
      setDeciding(false);
    }
  };

  return (
    <DetailShell onBack={onBack}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_408px] xl:items-start">
        {/* Left: message + sources */}
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-wash/50 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3.5">
                <Avatar name={email.sender} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-[13px] font-semibold text-ink">
                      {senderName(email.sender)}
                    </p>
                    <span className="truncate text-[11.5px] text-muted">
                      {email.sender}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-faint">
                    {formatDateTime(email.received_at)}
                  </p>
                </div>
                <CategoryBadge category={email.category} />
              </div>
              <h1 className="text-balance mt-4 text-[19px] leading-snug font-semibold tracking-[-0.02em] text-ink sm:text-[21px]">
                {email.subject}
              </h1>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-[13.5px] leading-7 whitespace-pre-wrap text-body">
                {email.body || email.snippet}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-wash/40 px-5 py-2.5 text-[11px] text-faint sm:px-6">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                Received in the support inbox
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                Filed as {CATEGORY_META[email.category]?.label ?? email.category}
              </span>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              icon={
                <IconTile tone="teal" size="sm">
                  <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                </IconTile>
              }
              title="Grounded in your docs"
              subtitle="Chunks Mailroom retrieved from the knowledge base to write this reply."
              action={
                rag.length > 0 ? (
                  <Badge dot={false}>
                    {rag.length} source{rag.length === 1 ? '' : 's'}
                  </Badge>
                ) : undefined
              }
            />

            {rag.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-border-strong bg-wash/50 px-4 py-3.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
                <p className="text-[12px] leading-relaxed text-muted">
                  No knowledge-base context was retrieved for this email — the draft
                  was written without supporting docs.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {rag.map((chunk, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-border bg-wash/60 p-4 transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper text-[10px] font-semibold text-muted ring-1 ring-border tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] leading-relaxed text-body">
                          {chunk.chunk}
                        </p>
                        <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] text-faint ring-1 ring-border">
                          <FileText className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{chunk.source}</span>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right: draft review */}
        <div className="min-w-0 xl:sticky xl:top-6">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-wash/40 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconTile tone="teal" size="sm">
                  <Wand2 className="h-4 w-4" strokeWidth={1.75} />
                </IconTile>
                <div className="min-w-0">
                  <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
                    Draft reply
                  </h2>
                  <p className="text-[10.5px] text-faint">
                    {draft
                      ? `Drafted ${formatDateTime(draft.created_at)}`
                      : 'AI-assisted · human approved'}
                  </p>
                </div>
              </div>
              {draft && <DraftStatusBadge status={draft.status} />}
            </div>

            {!draft ? (
              <EmptyState
                art="mail"
                title="No draft yet"
                subtitle="Mailroom hasn't written a reply for this email yet. Run it from Settings to process the inbox and generate drafts."
                action={
                  <Button variant="accent" size="sm" onClick={onGoSettings}>
                    <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Go to Settings
                  </Button>
                }
              />
            ) : (
              <div className="p-5">
                {draft.proofreader_feedback && (
                  <div className="flex gap-2.5 rounded-xl border border-warning/15 bg-tint-warning px-3.5 py-3">
                    <MessageSquareQuote
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      strokeWidth={1.75}
                    />
                    <div>
                      <p className="text-[11.5px] font-semibold text-ink">
                        Proofreader notes
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-body">
                        {draft.proofreader_feedback}
                      </p>
                    </div>
                  </div>
                )}

                {decided && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-wash px-3.5 py-3">
                    <Badge
                      tone={
                        draft.status === 'approved'
                          ? 'success'
                          : draft.status === 'sent'
                            ? 'teal'
                            : 'error'
                      }
                      dot
                    >
                      {draft.status === 'approved'
                        ? 'Approved'
                        : draft.status === 'sent'
                          ? 'Sent'
                          : 'Rejected'}
                    </Badge>
                    <p className="text-[11.5px] leading-relaxed text-muted">
                      {draft.decided_by ? `Decided by ${draft.decided_by}` : 'Decided'}
                      {draft.decision_note ? ` — “${draft.decision_note}”` : ''}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <label
                    htmlFor="draft-body"
                    className="text-[11.5px] font-medium text-ink"
                  >
                    Reply text
                    {decided && (
                      <span className="ml-1.5 font-normal text-faint">(locked)</span>
                    )}
                  </label>
                  {bodyDirty && !decided && (
                    <span className="rounded-full bg-tint-warning px-2 py-0.5 text-[10px] font-medium text-warning">
                      Unsaved
                    </span>
                  )}
                </div>
                <textarea
                  id="draft-body"
                  value={body}
                  disabled={decided}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setBodyDirty(true);
                    setActionOk(null);
                  }}
                  rows={12}
                  className="mt-1.5 min-h-[248px] w-full resize-y rounded-xl border border-border bg-wash/40 px-4 py-3.5 text-[13px] leading-relaxed text-body transition-colors placeholder:text-faint hover:border-border-strong focus:border-teal/40 focus:bg-paper focus:ring-[3px] focus:ring-teal/10 focus:outline-none disabled:cursor-not-allowed disabled:bg-wash disabled:text-muted"
                  placeholder="Write the reply…"
                />

                {actionError && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-tint-error px-3 py-2 text-[11.5px] leading-relaxed text-error">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    {actionError}
                  </p>
                )}
                {actionOk && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-tint-success px-3 py-2 text-[11.5px] leading-relaxed text-success">
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    {actionOk}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={approve}
                    disabled={decided}
                    loading={deciding}
                  >
                    {!deciding && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                    Approve &amp; queue reply
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      onClick={saveEdits}
                      disabled={decided || !bodyDirty}
                      loading={saving}
                    >
                      {!saving && <Save className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      Save edits
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowReject(true)}
                      disabled={decided}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                      Reject
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                  Approving queues the reply to be sent. Rejecting discards the draft and
                  records your reason for the team.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showReject && draft && (
        <Modal title="Reject this draft" onClose={() => setShowReject(false)}>
          <p className="text-[12.5px] leading-relaxed text-muted">
            The draft will be discarded and the email stays unanswered. Tell the team
            why, so the next draft can be better.
          </p>
          <label
            htmlFor="reject-reason"
            className="mt-4 mb-1.5 block text-[11.5px] font-medium text-ink"
          >
            Reason
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. Tone is too formal, and the refund policy is wrong."
            className="w-full resize-y rounded-xl border border-border bg-wash/40 px-3.5 py-3 text-[13px] leading-relaxed text-body transition-colors placeholder:text-faint hover:border-border-strong focus:border-teal/40 focus:bg-paper focus:ring-[3px] focus:ring-teal/10 focus:outline-none"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={reject}
              disabled={!rejectReason.trim()}
              loading={deciding}
            >
              Reject draft
            </Button>
          </div>
        </Modal>
      )}
    </DetailShell>
  );
}

function DetailShell({
  onBack,
  children,
}: {
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back
      </button>
      {children}
    </div>
  );
}
