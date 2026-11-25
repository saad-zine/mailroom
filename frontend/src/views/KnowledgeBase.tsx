import { useEffect, useRef, useState } from 'react';
import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api, type KbDoc } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '../components/ui';

export function KnowledgeBase() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);
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
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Knowledge base</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          The docs Automail answers from. Upload product guides, FAQs, and policies —
          drafts cite them when replying.
        </p>
      </div>

      {notice && (
        <p className="rounded-lg bg-tint-success px-4 py-2.5 text-[13px] text-success">
          {notice}
        </p>
      )}
      {noticeError && (
        <p className="rounded-lg bg-tint-error px-4 py-2.5 text-[13px] text-error">
          {noticeError}
        </p>
      )}

      <Card className="p-5">
        <SectionHeader
          title="Add documents"
          subtitle="Plain text (.txt) or Markdown (.md) files. Each file is split into chunks the draft agent can retrieve."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={reindex}
              loading={reindexing}
              disabled={docs.length === 0}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
              Re-index all
            </Button>
          }
        />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFile(e.dataTransfer.files?.[0]);
          }}
          disabled={uploading}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-wash px-6 py-10 text-center transition-colors hover:border-teal hover:bg-tint-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-5 w-5 text-muted" strokeWidth={1.5} />
          <span className="text-sm font-medium text-ink">
            {uploading ? 'Uploading…' : 'Choose a .txt or .md file to upload'}
          </span>
          <span className="text-xs text-muted">
            Or drop a file here — it will be chunked and indexed for RAG.
          </span>
        </button>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading documents…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : docs.length === 0 ? (
        <Card>
          <EmptyState
            title="No documents yet"
            subtitle="Upload your first document so Automail can answer product questions from your own docs, not from thin air."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                Upload a document
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-[#f3f4f6]">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-tint">
                <FileText className="h-[18px] w-[18px] text-muted" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
                <p className="text-[13px] text-muted">
                  {doc.chunks} chunk{doc.chunks === 1 ? '' : 's'} · added{' '}
                  {formatDateTime(doc.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void remove(doc)}
                disabled={deletingId === doc.id}
                aria-label={`Delete ${doc.name}`}
              >
                <Trash2 className="h-4 w-4 text-error" strokeWidth={1.5} />
                <span className="text-error">Delete</span>
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
