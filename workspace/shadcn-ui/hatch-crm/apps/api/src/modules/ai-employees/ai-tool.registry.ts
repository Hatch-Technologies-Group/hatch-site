import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type ZodTypeAny } from 'zod';

import { UserRole } from '@hatch/db';

export interface AiToolContext {
  tenantId: string;
  orgId: string;
  actorId: string;
  actorRole: UserRole;
  sessionId: string;
  employeeInstanceId: string;
}

export interface AiToolDefinition<TInput = unknown, TResult = unknown> {
  key: string;
  description: string;
  schema: ZodTypeAny;
  allowAutoRun?: boolean;
  defaultRequiresApproval?: boolean;
  run(input: TInput, context: AiToolContext): Promise<TResult>;
}

@Injectable()
export class AiToolRegistry {
  private readonly tools = new Map<string, AiToolDefinition<any, any>>();

  register<TInput, TResult>(definition: AiToolDefinition<TInput, TResult>) {
    if (this.tools.has(definition.key)) {
      throw new BadRequestException(`Tool ${definition.key} already registered`);
    }
    if (!definition.schema) {
      throw new BadRequestException(`Tool ${definition.key} requires a schema`);
    }
    this.tools.set(definition.key, definition);
  }

  get<TInput, TResult>(key: string): AiToolDefinition<TInput, TResult> | null {
    return (this.tools.get(key) as AiToolDefinition<TInput, TResult> | undefined) ?? null;
  }

  list(): AiToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute<TInput, TResult>(key: string, payload: unknown, context: AiToolContext): Promise<TResult> {
    const tool = this.get<TInput, TResult>(key);
    if (!tool) {
      throw new NotFoundException(`Tool ${key} is not registered`);
    }
    const parsed = tool.schema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        message: `Invalid payload for ${key}`,
        issues: parsed.error.issues
      });
    }
    return tool.run(parsed.data as TInput, context);
  }
}
