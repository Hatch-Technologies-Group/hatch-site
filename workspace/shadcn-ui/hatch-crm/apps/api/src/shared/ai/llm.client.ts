import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ResponseInput } from 'openai/resources/responses/responses';

import {
  DEFAULT_EMBEDDING_MODEL_ID,
  DEFAULT_LLM_MODEL_ID,
  INTERNAL_LLM_PROVIDER_ID,
  type LlmChatMessage,
  type LlmResponseFormat
} from './llm.constants';

const COMPLETION_MODEL_ALIASES: Record<string, string> = {
  [DEFAULT_LLM_MODEL_ID]: 'gpt-4o-mini',
  'internalai-default': 'gpt-4o-mini',
  'llmclient-default': 'gpt-4o-mini'
};

const EMBEDDING_MODEL_ALIASES: Record<string, string> = {
  [DEFAULT_EMBEDDING_MODEL_ID]: 'text-embedding-3-small',
  'internalai-embeddings': 'text-embedding-3-small'
};

const DEFAULT_VENDOR_COMPLETION_MODEL = 'gpt-4o-mini';
const DEFAULT_VENDOR_EMBEDDING_MODEL = 'text-embedding-3-small';

export class LLMClient {
  private readonly client: OpenAI | null;
  private readonly log = new Logger(LLMClient.name);

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.client = null;
      this.log.warn('LLM client initialized without API key; fallbacks will be used.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  getProviderId(): string {
    return INTERNAL_LLM_PROVIDER_ID;
  }

  getStatus() {
    return {
      provider: this.getProviderId(),
      isConfigured: this.isConfigured()
    };
  }

  async createResponse(options: {
    model: string;
    input: string | ResponseInput;
    maxOutputTokens?: number;
    temperature?: number;
    timeoutMs?: number;
  }) {
    if (!this.client) {
      return null;
    }

    const requestOptions = options.timeoutMs ? { timeout: options.timeoutMs } : undefined;

    return this.client.responses.create(
      {
        model: this.mapCompletionModel(options.model),
        input: options.input,
        max_output_tokens: options.maxOutputTokens,
        temperature: options.temperature
      },
      requestOptions
    );
  }

  async createChatCompletion(options: {
    model: string;
    messages: LlmChatMessage[];
    temperature?: number;
    responseFormat?: LlmResponseFormat;
  }): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    const payload: ChatCompletionMessageParam[] = options.messages.map((message) => ({
      role: message.role,
      content: this.stringifyContent(message.content)
    }));

    const completion = await this.client.chat.completions.create({
      model: this.mapCompletionModel(options.model),
      temperature: options.temperature,
      messages: payload,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined
    });

    return completion.choices?.[0]?.message?.content ?? null;
  }

  async createEmbeddings(options: { texts: string[]; model?: string }): Promise<number[][]> {
    if (!this.client) {
      throw new Error('LLM provider is not configured');
    }

    const response = await this.client.embeddings.create({
      model: this.mapEmbeddingModel(options.model),
      input: options.texts
    });

    return response.data.map((item) => item.embedding);
  }

  private mapCompletionModel(model?: string): string {
    const requested = (model || DEFAULT_LLM_MODEL_ID).trim().toLowerCase();
    return COMPLETION_MODEL_ALIASES[requested] ?? model ?? DEFAULT_VENDOR_COMPLETION_MODEL;
  }

  private mapEmbeddingModel(model?: string): string {
    const requested = (model || DEFAULT_EMBEDDING_MODEL_ID).trim().toLowerCase();
    return EMBEDDING_MODEL_ALIASES[requested] ?? model ?? DEFAULT_VENDOR_EMBEDDING_MODEL;
  }

  private stringifyContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    try {
      return JSON.stringify(content ?? '');
    } catch {
      return String(content ?? '');
    }
  }
}
