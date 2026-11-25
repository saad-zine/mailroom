// API base URL. VITE_API_URL overrides it when set (e.g. pointing a
// local frontend at a remote backend). Otherwise it is relative
// (same origin): on Vercel the frontend and the API share the origin
// and /api/* is rewritten to the serverless function; in local dev
// the Vite dev server proxies /api to localhost:8000 (vite.config.ts).
const BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export const API_BASE = BASE;

export type Category =
  | 'product_enquiry'
  | 'customer_complaint'
  | 'customer_feedback'
  | 'unrelated';

export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'sent';

export interface EmailItem {
  id: string;
  thread_id: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  category: Category;
  status: string;
  received_at: string;
  has_draft: boolean;
}

export interface RagChunk {
  chunk: string;
  source: string;
}

export interface Draft {
  id: string;
  email_id: string;
  sender: string;
  subject: string;
  category: Category;
  body: string;
  proofreader_feedback: string | null;
  status: DraftStatus;
  created_at: string;
  decided_by: string | null;
  decision_note: string | null;
}

export interface RunStep {
  seq: number;
  node: string;
  detail: string;
  status: string;
}

export interface Run {
  run_id: string;
  status: string;
  steps: RunStep[];
  started_at: string | null;
  ended_at: string | null;
}

export interface KbDoc {
  id: string;
  name: string;
  chunks: number;
  created_at: string;
}

export interface Health {
  status: string;
  mode: 'mock' | 'live';
  provider: string;
  model: string;
  gmail_connected: boolean;
  demo: boolean;
  llm_available?: boolean;
  vector_rag_available?: boolean;
  missing_keys?: string[];
  setup_hint?: string | null;
}

export interface Stats {
  total_emails: number;
  by_category: Record<string, number>;
  pending_drafts: number;
  approved: number;
  rejected: number;
  approval_rate: number;
  avg_first_response_min: number | null;
}

export interface SettingsInfo {
  mode: string;
  provider: string;
  model: string;
  gmail_connected: boolean;
  demo_mode: boolean;
  version: string;
  llm_available?: boolean;
  vector_rag_available?: boolean;
  missing_keys?: string[];
  setup_hint?: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(
      `Could not reach the Mailroom API at ${BASE}. Is the backend running?`,
      0,
    );
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data: unknown = await res.json();
      if (data && typeof data === 'object' && 'detail' in data) {
        const d = (data as { detail: unknown }).detail;
        if (typeof d === 'string' && d) msg = d;
      }
    } catch {
      /* keep default message */
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** The backend returns either `{draft}` or the draft itself for write calls. */
function unwrapDraft(data: unknown): Draft {
  if (data && typeof data === 'object' && 'draft' in data) {
    return (data as { draft: Draft }).draft;
  }
  return data as Draft;
}

export const api = {
  health: () => req<Health>('/health'),
  stats: () => req<Stats>('/api/stats'),
  settings: () => req<SettingsInfo>('/api/settings'),

  listEmails: (params: { category?: string; status?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.status) q.set('status', params.status);
    q.set('limit', String(params.limit ?? 50));
    return req<{ emails: EmailItem[] }>(`/api/emails?${q.toString()}`);
  },

  getEmail: (id: string) =>
    req<{ email: EmailItem; draft: Draft | null; rag_context: RagChunk[] }>(
      `/api/emails/${encodeURIComponent(id)}`,
    ),

  listDrafts: (status = 'pending') =>
    req<{ drafts: Draft[] }>(`/api/drafts?status=${encodeURIComponent(status)}`),

  getDraft: (id: string) =>
    req<{ draft: Draft }>(`/api/drafts/${encodeURIComponent(id)}`),

  updateDraft: async (id: string, body: string) => {
    const data = await req<unknown>(`/api/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    return unwrapDraft(data);
  },

  approveDraft: async (id: string, note?: string) => {
    const data = await req<unknown>(
      `/api/drafts/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note ? { note } : {}),
      },
    );
    return unwrapDraft(data);
  },

  rejectDraft: async (id: string, reason: string) => {
    const data = await req<unknown>(
      `/api/drafts/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      },
    );
    return unwrapDraft(data);
  },

  startRun: () => req<{ run_id: string; status: string }>('/api/runs', { method: 'POST' }),
  getRun: (id: string) => req<Run>(`/api/runs/${encodeURIComponent(id)}`),

  listKb: () => req<{ docs: KbDoc[] }>('/api/kb'),

  uploadKb: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const data = await req<unknown>('/api/kb/upload', { method: 'POST', body: fd });
    if (data && typeof data === 'object' && 'doc' in data) {
      return (data as { doc: KbDoc }).doc;
    }
    return data as KbDoc;
  },

  reindexKb: () => req<{ status: string }>('/api/kb/reindex', { method: 'POST' }),
  deleteKb: (id: string) =>
    req<void>(`/api/kb/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
