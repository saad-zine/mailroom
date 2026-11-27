import { useEffect, useRef, useState } from 'react';
import {
  CircleCheck,
  FileText,
  Layers,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { api, type KbDoc } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconTile,
  PageHeader,
  SectionHeader,
  Skeleton,
} from '../components/ui';
import { cn } from '../lib/utils';

export function KnowledgeBase() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .listKb()
      .then((res) => setDocs(res.docs))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setNoticeError('Only .txt and .md files can be uploaded.');
      setNotice(null);
      return;
    }
    setUploading(true);
    setNotice(null);
    setNoticeError(null);
    try {
      await api.uploadKb(file);
      setNotice(`“${file.name}” uploaded and indexed.`);
      load();
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reindex = async () => {
    setReindexing(true);
    setNotice(null);
    setNoticeError(null);
    try {
      await api.reindexKb();
      setNotice('Knowledge base re-indexed.');
      load();
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : 'Re-index failed.');
    } finally {
      setReindexing(false);
    }
  };

  const remove = async (doc: KbDoc) => {
    if (!window.confirm(`Delete “${doc.name}” from the knowledge base?`)) return;
    setDeletingId(doc.id);
    setNotice(null);
    setNoticeError(null);
    try {
      await api.deleteKb(doc.id);
      setNotice(`“${doc.name}” deleted.`);
      setDocs((prev) => prev.filter((entry) => entry.id !== doc.id));
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalChunks = docs.reduce((sum, doc) => sum + doc.chunks, 0);
  const latest = docs.reduce<string | null>((acc, doc) => {
    if (!acc) return doc.created_at;
    return new Date(doc.created_at).getTime() > new Date(acc).getTime()
      ? doc.created_at
      : acc;
  }, null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Grounding"
        title="Knowledge base"
        description="The docs Mailroom answers from. Upload product guides, FAQs, and policies — every draft cites the chunks it used."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={reindex}
              loading={reindexing}
              disabled={docs.length === 0}
            >
              {!reindexing && <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
              Re-index all
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
            >
              {!uploading && <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />}
              Upload document
            </Button>
          </>
        }
      />

      {(notice || noticeError) && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-[12px]',
            notice
              ? 'border-success/15 bg-tint-success text-success'
              : 'border-error/15 bg-tint-error text-error',
          )}
        >
          {notice ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          <p className="leading-relaxed">{notice ?? noticeError}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <IconTile tone="teal" size="sm">
            <FileText className="h-4 w-4" strokeWidth={1.75} />
          </IconTile>
          <p className="mt-3 text-[22px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {docs.length}
          </p>
          <p className="mt-1 text-[11.5px] text-muted">
            {docs.length === 1 ? 'Document' : 'Documents'}
          </p>
        </Card>
        <Card className="p-4">
          <IconTile tone="blue" size="sm">
            <Layers className="h-4 w-4" strokeWidth={1.75} />
          </IconTile>
          <p className="mt-3 text-[22px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {totalChunks}
          </p>
          <p className="mt-1 text-[11.5px] text-muted">Indexed chunks</p>
        </Card>
        <Card className="p-4">
          <IconTile tone="neutral" size="sm">
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          </IconTile>
          <p className="mt-3 truncate text-[13px] leading-none font-semibold tracking-[-0.01em] text-ink">
            {latest ? formatDateTime(latest) : '—'}
          </p>
          <p className="mt-1.5 text-[11.5px] text-muted">Last added</p>
        </Card>
      </div>

      {/* Upload */}
      <Card className="p-5 sm:p-6">
        <SectionHeader
          icon={
            <IconTile tone="teal" size="sm">
              <Upload className="h-4 w-4" strokeWidth={1.75} />
            </IconTile>
          }
          title="Add documents"
          subtitle="Plain text (.txt) or Markdown (.md). Each file is split into chunks the draft agent can retrieve."
        />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void onFile(event.dataTransfer.files?.[0]);
          }}
          disabled={uploading}
          className={cn(
            'group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-9 text-center transition-all duration-150',
            'focus-visible:ring-2 focus-visible:ring-teal/25 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            dragging
              ? 'border-teal bg-tint-teal'
              : 'border-border-strong bg-wash/50 hover:border-teal/50 hover:bg-tint-teal/40',
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-tint-teal to-white text-teal shadow-xs ring-1 ring-teal/15 ring-inset transition-transform duration-150 group-hover:-translate-y-0.5">
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="mt-3 text-[13px] font-semibold text-ink">
            {uploading ? 'Uploading…' : 'Drop a file here, or browse'}
          </span>
          <span className="mt-0.5 text-[11.5px] text-muted">
            TXT or Markdown · chunked and indexed for retrieval
          </span>
          <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper px-3 text-[12px] font-medium text-ink shadow-xs">
            Choose a file
          </span>
        </button>
      </Card>

      {/* Library */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile tone="neutral" size="sm">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            </IconTile>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                Indexed documents
              </h2>
              <p className="text-[12px] text-muted">
                What the draft agent can cite right now.
              </p>
            </div>
          </div>
          <Badge dot={false}>
            {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
          </Badge>
        </div>

        {loading ? (
          <div className="divide-y divide-border/70">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-[10px]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-1/3" />
                  <Skeleton className="h-2 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : docs.length === 0 ? (
          <EmptyState
            art="docs"
            title="No documents yet"
            subtitle="Upload your first document so Mailroom can answer product questions from your own docs, not from thin air."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                Upload a document
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border/70">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-wash/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-teal text-teal ring-1 ring-teal/10 ring-inset">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {doc.name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {doc.chunks} chunk{doc.chunks === 1 ? '' : 's'} · added{' '}
                    {formatDateTime(doc.created_at)}
                  </p>
                </div>
                <span className="hidden sm:inline-flex">
                  <Badge dot={false}>
                    {doc.name.split('.').pop()?.toUpperCase() ?? 'DOC'}
                  </Badge>
                </span>
                <button
                  type="button"
                  onClick={() => void remove(doc)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.name}`}
                  title={`Delete ${doc.name}`}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-faint transition-colors hover:bg-tint-error hover:text-error focus-visible:ring-2 focus-visible:ring-error/20 focus-visible:outline-none disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
