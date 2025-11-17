import { BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import type { StageDto } from './dto/stage.dto';

const ajv = new Ajv({ allErrors: true, strict: false } as any);
addFormats(ajv);

export function validateUniqueStageNamesAndOrder(stages: StageDto[]) {
  const names = new Set<string>();
  const orders = new Set<number>();

  for (const stage of stages) {
    if (names.has(stage.name)) {
      throw new BadRequestException(`Duplicate stage name: ${stage.name}`);
    }
    if (orders.has(stage.order)) {
      throw new BadRequestException(`Duplicate stage order: ${stage.order}`);
    }
    names.add(stage.name);
    orders.add(stage.order);
  }
}

export function compileJsonSchemaOrThrow(json: unknown, label: string) {
  try {
    const schema = typeof json === 'string' ? JSON.parse(json) : json;
    ajv.compile(schema);
  } catch (error) {
    throw new BadRequestException(`${label} is not a valid JSON Schema: ${String(error)}`);
  }
}

export function validateAutomationPayload(automation: { trigger: unknown; actions: unknown }) {
  const trigger = automation?.trigger as Record<string, unknown> | null;
  if (!trigger || typeof trigger !== 'object' || !trigger['on']) {
    throw new BadRequestException('Automation.trigger.on is required');
  }
  if (!Array.isArray(automation?.actions) || automation.actions.length === 0) {
    throw new BadRequestException('Automation.actions must include at least one action');
  }
}
