export type CopilotContext = {
  surface: 'dashboard' | 'lead' | 'listing' | 'transaction' | 'admin' | 'other';
  entityId?: string;
  entityType?: 'lead' | 'contact' | 'listing' | 'transaction';
  summary?: string;
  metadata?: Record<string, unknown>;
};

const CONTEXT_EVENT = 'copilot:context';

export function emitCopilotContext(context: CopilotContext) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
}
