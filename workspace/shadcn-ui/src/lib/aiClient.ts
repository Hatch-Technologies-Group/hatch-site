export type CopilotCitation = {
  id: string;
  entityType: string;
  entityId: string;
  score?: number;
  meta?: Record<string, unknown> | null;
};

export type CopilotSnippet = {
  id?: string;
  content: string;
  score?: number;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown> | null;
};

export type CopilotChatResponse = {
  messages: Array<{ role: string; content: string }>;
  citations?: CopilotCitation[];
  snippets?: CopilotSnippet[];
};

export type StreamCopilotEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done'; citations?: CopilotCitation[]; snippets?: CopilotSnippet[] }
  | { type: 'error'; error: string };

const allowCrossOriginApi = (import.meta.env.VITE_ALLOW_CROSS_ORIGIN_API ?? 'false').toLowerCase() === 'true';
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const API_BASE =
  (configuredApiBase &&
  (configuredApiBase.startsWith('/') || typeof window === 'undefined' || allowCrossOriginApi)
    ? configuredApiBase
    : '/api/v1'
  ).replace(/\/$/, '');
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

const buildHeaders = () => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (API_TOKEN) {
    headers.set('Authorization', `Bearer ${API_TOKEN}`);
  }
  return headers;
};

export async function copilotChat(body: {
  threadId?: string;
  messages: Array<{ role: string; content: string }>;
  context?: Record<string, unknown>;
}): Promise<CopilotChatResponse> {
  const res = await fetch(`${API_BASE}/ai/copilot/chat`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ ...body, stream: false })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<CopilotChatResponse>;
}

export async function* streamCopilotChat(body: {
  threadId?: string;
  messages: Array<{ role: string; content: string }>;
  context?: Record<string, unknown>;
  signal?: AbortSignal;
}): AsyncGenerator<StreamCopilotEvent, void, unknown> {
  const res = await fetch(`${API_BASE}/ai/copilot/chat`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ ...body, stream: true }),
    signal: body.signal
  });

  if (!res.ok || !res.body) {
    const message = await res.text().catch(() => 'Failed to start stream');
    yield { type: 'error', error: message };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      if (!chunk.startsWith('data:')) continue;
      const payload = chunk.replace(/^data:\s*/, '').trim();
      if (!payload || payload === '[DONE]') continue;

      let parsed: any;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (parsed.error) {
        yield { type: 'error', error: parsed.error };
      } else if (parsed.done) {
        yield {
          type: 'done',
          citations: parsed.citations ?? [],
          snippets: parsed.snippets ?? []
        };
      } else if (parsed.delta) {
        yield { type: 'delta', delta: parsed.delta };
      }
    }
  }
}
