import { DEFAULT_LLM_MODEL_ID } from '@/shared/ai/llm.constants';

export const AiConfig = {
  model: process.env.AI_MODEL || DEFAULT_LLM_MODEL_ID,
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000)
};
