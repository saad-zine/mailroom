import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  MessageSquareQuote,
  Play,
  Save,
  X,
} from 'lucide-react';
import { api, ApiError, type Draft, type EmailItem, type RagChunk } from '../lib/api';
import { formatDateTime, initials } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  CategoryBadge,
  DraftStatusBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
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
          <LoadingState label="Loading email…" />
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
      <div className="space-y-5">
        {/* Original email */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-semibold text-body">
              {initials(email.sender)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold leading-snug text-ink">
                  {email.subject}
                </h1>
                <CategoryBadge category={email.category} />
              </div>
              <p className="mt-1 text-[13px] text-muted">
                From <span className="font-medium text-body">{email.sender}</span>
                {' · '}
                {formatDateTime(email.received_at)}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-[#f3f4f6] pt-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
              {email.body || email.snippet}
            </p>
          </div>
        </Card>

        {/* RAG context */}
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-ink">What the draft used</h2>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Chunks retrieved from your knowledge base to answer this email.
          </p>
          {rag.length === 0 ? (
            <p className="mt-4 rounded-lg bg-wash px-4 py-3 text-[13px] text-muted">
              No knowledge-base context was retrieved for this email — the draft was
              written without supporting docs.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rag.map((c, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-wash px-4 py-3"
                >
                  <p className="text-[13px] leading-relaxed text-body">{c.chunk}</p>
                  <p className="mt-2 font-mono text-xs text-faint">Source: {c.source}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Draft review — the human in the loop */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink">Draft reply</h2>
              {draft && <DraftStatusBadge status={draft.status} />}
            </div>
            {draft && (
              <span className="text-xs text-faint">
                Drafted {formatDateTime(draft.created_at)}
              </span>
            )}
          </div>

          {!draft ? (
            <EmptyState
              title="No draft yet for this email"
              subtitle="Automail hasn't drafted a reply for this email yet. Run Automail to process the inbox and generate drafts."
              action={
                <Button variant="accent" size="sm" onClick={onGoSettings}>
                  <Play className="h-4 w-4" strokeWidth={1.5} />
                  Go to Settings to run Automail
                </Button>
              }
            />
          ) : (
            <>
              {/* Proofreader feedback */}
              {draft.proofreader_feedback && (
                <div className="mt-4 flex gap-3 rounded-lg border border-[#fde68a]/60 bg-tint-warning px-4 py-3">
                  <MessageSquareQuote
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warning"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      Proofreader notes
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-body">
                      {draft.proofreader_feedback}
                    </p>
                  </div>
                </div>
              )}

              {/* Decided state */}
              {decided && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-wash px-4 py-3">
                  <Badge
                    tone={
                      draft.status === 'approved'
                        ? 'success'
                        : draft.status === 'sent'
                          ? 'teal'
                          : 'error'
                    }
                  >
                    {draft.status === 'approved'
                      ? 'Approved'
                      : draft.status === 'sent'
                        ? 'Sent'
                        : 'Rejected'}
                  </Badge>
                  <p className="text-[13px] text-muted">
                    {draft.decided_by ? `Decided by ${draft.decided_by}` : 'Decided'}
                    {draft.decision_note ? ` — “${draft.decision_note}”` : ''}
                  </p>
                </div>
              )}

              {/* Editable draft */}
              <label
                htmlFor="draft-body"
                className="mt-5 mb-1.5 block text-[13px] font-medium text-ink"
              >
                Reply text
                {decided && (
                  <span className="ml-2 font-normal text-muted">
                    (locked — this draft has been decided)
                  </span>
                )}
              </label>
              <textarea
                id="draft-body"
                value={body}
                disabled={decided}
                onChange={(e) => {
                  setBody(e.target.value);
                  setBodyDirty(true);
                  setActionOk(null);
                }}
                rows={12}
                className="w-full resize-y rounded-lg border border-border bg-paper px-4 py-3 text-sm leading-relaxed text-body placeholder:text-muted transition-colors hover:border-border-strong focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/15 disabled:cursor-not-allowed disabled:bg-wash disabled:text-muted"
                placeholder="Draft reply…"
              />

              {actionError && (
                <p className="mt-3 rounded-lg bg-tint-error px-3 py-2 text-[13px] text-error">
                  {actionError}
                </p>
              )}
              {actionOk && (
                <p className="mt-3 rounded-lg bg-tint-success px-3 py-2 text-[13px] text-success">
                  {actionOk}
                </p>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={approve}
                  disabled={decided}
                  loading={deciding}
                >
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowReject(true)}
                  disabled={decided}
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  onClick={saveEdits}
                  disabled={decided || !bodyDirty}
                  loading={saving}
                >
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                  Save edits
                </Button>
                {bodyDirty && !decided && (
                  <span className="text-xs text-muted">Unsaved changes</span>
                )}
              </div>
              <p className="mt-3 text-xs text-faint">
                Approving queues the reply to be sent. Rejecting discards the draft —
                add a reason so the team knows why.
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Reject modal */}
      {showReject && draft && (
        <Modal title="Reject this draft" onClose={() => setShowReject(false)}>
          <p className="text-[13px] text-muted">
            The draft will be discarded and the email stays unanswered. Tell the team
            why, so the next draft can be better.
          </p>
          <label
            htmlFor="reject-reason"
            className="mt-4 mb-1.5 block text-[13px] font-medium text-ink"
          >
            Reason
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. Tone is too formal, and the refund policy is wrong."
            className="w-full resize-y rounded-lg border border-border bg-paper px-3 py-2.5 text-sm text-body placeholder:text-muted transition-colors hover:border-border-strong focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/15"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
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
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-wash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back
      </button>
      {children}
    </div>
  );
}
