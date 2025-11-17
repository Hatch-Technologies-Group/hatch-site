'use client';

import { useEffect } from 'react';

import { emitCopilotContext, type CopilotContext } from '@/lib/copilot/events';

type Props = {
  context: CopilotContext;
};

export function CopilotContextEmitter({ context }: Props) {
  useEffect(() => {
    emitCopilotContext(context);
  }, [context]);

  return null;
}
