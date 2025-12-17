const SESSION_ID_KEY = 'hatch_session_id_v1';

function safeRandomId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSessionId(): { sessionId: string; isNew: boolean } {
  if (typeof window === 'undefined') {
    return { sessionId: 'server', isNew: false };
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing && existing.trim().length > 0) {
      return { sessionId: existing.trim(), isNew: false };
    }
  } catch {
    // ignore storage errors
  }

  const sessionId = safeRandomId();
  try {
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch {
    // ignore storage errors
  }

  return { sessionId, isNew: true };
}

