import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  AuditAction,
  PipelineStatus,
  Prisma,
  type FieldSet,
  type Pipeline,
  type PipelineAutomation,
  type Stage
} from '@hatch/db';

import type { RequestContext } from '../common/request-context';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignPipelineDto,
  CreatePipelineDto,
  MutateAutomationDto,
  MutateFieldSetDto,
  MutateStagesDto,
  PublishPipelineDto,
  StageMigrationMappingDto,
  StagePayloadDto,
  UpdatePipelineDto
} from './dto/pipeline-designer.dto';

type PipelineWithDesignerRelations = Prisma.PipelineGetPayload<{
  include: {
    stages: { orderBy: { order: 'asc' } };
    fieldSets: true;
    automations: true;
  };
}>;

@Injectable()
export class PipelineDesignerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2
  ) {}

  async list(ctx: RequestContext): Promise<PipelineWithDesignerRelations[]> {
    return this.prisma.pipeline.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ familyId: 'asc' }, { version: 'desc' }],
      include: this.defaultInclude()
    });
  }

  async createDraft(ctx: RequestContext, dto: CreatePipelineDto): Promise<PipelineWithDesignerRelations> {
    const base = await this.resolveSourcePipeline(ctx, dto);
    const familyId = base?.familyId;
    const version = base ? base.version + 1 : 1;
    const order = base ? base.order : await this.nextPipelineOrder(ctx.tenantId);

    const pipelineType = dto.type ?? base?.type ?? 'custom';
    const clonedStages: Prisma.StageUncheckedCreateWithoutPipelineInput[] | undefined = base
      ? base.stages.map((stage) => ({
          tenantId: ctx.tenantId,
          name: stage.name,
          order: stage.order,
          probWin: stage.probWin ?? null,
          slaHours: stage.slaHours ?? null,
          slaMinutes: stage.slaMinutes ?? null,
          exitReasons: this.asNullableJson(stage.exitReasons)
        }))
      : undefined;
    const clonedFieldSets: Prisma.FieldSetUncheckedCreateWithoutPipelineInput[] | undefined = base
      ? base.fieldSets.map((fieldSet) => ({
          tenantId: ctx.tenantId,
          target: fieldSet.target,
          schema: this.asJson(fieldSet.schema) as Prisma.InputJsonValue,
          uiSchema: this.asNullableJson(fieldSet.uiSchema) as
            | Prisma.JsonNullValueInput
            | Prisma.InputJsonValue,
          visibility: this.asNullableJson(fieldSet.visibility) as
            | Prisma.JsonNullValueInput
            | Prisma.InputJsonValue
        }))
      : undefined;
    const clonedAutomations: Prisma.PipelineAutomationUncheckedCreateWithoutPipelineInput[] | undefined =
      base
        ? base.automations.map((automation) => ({
            tenantId: ctx.tenantId,
            name: automation.name ?? null,
            trigger: this.asNullableJson(automation.trigger) as
              | Prisma.JsonNullValueInput
              | Prisma.InputJsonValue,
            actions: this.asNullableJson(automation.actions) as
              | Prisma.JsonNullValueInput
              | Prisma.InputJsonValue,
            isEnabled: automation.isEnabled
          }))
        : undefined;

    const pipeline = await this.prisma.pipeline.create({
      data: {
        tenantId: ctx.tenantId,
        brokerageId: ctx.tenantId,
        familyId: familyId ?? undefined,
        name: dto.name,
        type: pipelineType,
        useCase: dto.useCase ?? base?.useCase ?? null,
        status: PipelineStatus.DRAFT,
        version,
        order,
        stages: clonedStages
          ? {
              create: clonedStages
            }
          : undefined,
        fieldSets: clonedFieldSets
          ? {
              create: clonedFieldSets
            }
          : undefined,
        automations: clonedAutomations
          ? {
              create: clonedAutomations
            }
          : undefined
      },
      include: this.defaultInclude()
    });

    await this.audit.log({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      object: 'pipeline',
      recordId: pipeline.id,
      action: AuditAction.CREATE,
      diff: {
        status: pipeline.status,
        version
      }
    });

    this.events.emit('pipeline.draft.created', {
      tenantId: ctx.tenantId,
      pipelineId: pipeline.id,
      version: pipeline.version
    });

    return pipeline;
  }

  async updateDraft(
    ctx: RequestContext,
    pipelineId: string,
    dto: UpdatePipelineDto
  ): Promise<PipelineWithDesignerRelations> {
    const pipeline = await this.requirePipeline(ctx, pipelineId);
    if (pipeline.status !== PipelineStatus.DRAFT) {
      throw new BadRequestException('Only draft pipelines can be edited');
    }

    const data: Prisma.PipelineUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.useCase !== undefined) data.useCase = dto.useCase;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const updated = await this.prisma.pipeline.update({
      where: { id: pipeline.id },
      data,
      include: this.defaultInclude()
    });
    return updated;
  }

  async mutateStages(
    ctx: RequestContext,
    pipelineId: string,
    payload: MutateStagesDto
  ): Promise<PipelineWithDesignerRelations> {
    const pipeline = await this.requirePipeline(ctx, pipelineId, true);

    switch (payload.operation) {
      case 'create':
        if (!payload.stage) {
          throw new BadRequestException('stage payload is required for create');
        }
        await this.createStage(ctx, pipeline, payload.stage);
        break;
      case 'update':
        if (!payload.stage || !payload.stage.id) {
          throw new BadRequestException('stage.id is required for update');
        }
        await this.updateStage(ctx, pipeline, payload.stage.id, payload.stage);
        break;
      case 'delete':
        if (!payload.stageId) {
          throw new BadRequestException('stageId is required for delete');
        }
        await this.deleteStage(ctx, pipeline, payload.stageId);
        break;
      case 'reorder':
        if (!payload.stageOrder?.length) {
          throw new BadRequestException('stageOrder is required for reorder');
        }
        await this.reorderStages(ctx, pipeline, payload.stageOrder);
        break;
      default:
        throw new BadRequestException('Unsupported stage operation');
    }

    const updated = await this.requirePipeline(ctx, pipelineId, true);
    this.assertStageIntegrity(updated.stages);
    return updated;
  }

  async mutateFieldSets(
    ctx: RequestContext,
    pipelineId: string,
    payload: MutateFieldSetDto
  ): Promise<PipelineWithDesignerRelations> {
    const pipeline = await this.requirePipeline(ctx, pipelineId, true);
    switch (payload.operation) {
      case 'create':
        if (!payload.fieldSet) {
          throw new BadRequestException('fieldSet payload is required');
        }
        await this.prisma.fieldSet.create({
          data: {
            tenantId: ctx.tenantId,
            pipelineId: pipeline.id,
            target: payload.fieldSet.target,
            schema: this.asJson(payload.fieldSet.schema),
            uiSchema: this.asNullableJson(payload.fieldSet.uiSchema),
            visibility: this.asNullableJson(payload.fieldSet.visibility)
          }
        });
        break;
      case 'update':
        if (!payload.fieldSet?.id) {
          throw new BadRequestException('fieldSet.id is required for update');
        }
        await this.updateFieldSet(ctx, pipeline, payload.fieldSet.id, payload.fieldSet);
        break;
      case 'delete':
        if (!payload.fieldSetId) {
          throw new BadRequestException('fieldSetId is required for delete');
        }
        await this.deleteFieldSet(ctx, pipeline, payload.fieldSetId);
        break;
      default:
        throw new BadRequestException('Unsupported field-set operation');
    }

    return this.requirePipeline(ctx, pipelineId, true);
  }

  async mutateAutomations(
    ctx: RequestContext,
    pipelineId: string,
    payload: MutateAutomationDto
  ): Promise<PipelineWithDesignerRelations | { result: string }> {
    const pipeline = await this.requirePipeline(ctx, pipelineId, true);
    switch (payload.operation) {
      case 'create': {
        if (!payload.automation) throw new BadRequestException('automation payload is required');
        const createdActions = payload.automation.actions.map((entry) => entry.definition) as Prisma.JsonArray;
        await this.prisma.pipelineAutomation.create({
          data: {
            tenantId: ctx.tenantId,
            pipelineId: pipeline.id,
            name: payload.automation.name ?? null,
            trigger: this.asNullableJson(payload.automation.trigger),
            actions: this.asNullableJson(createdActions),
            isEnabled: payload.automation.isEnabled ?? true
          }
        });
        break;
      }
      case 'update': {
        if (!payload.automation?.id) {
          throw new BadRequestException('automation.id is required for update');
        }
        await this.updateAutomation(ctx, pipeline, payload.automation.id, payload.automation);
        break;
      }
      case 'delete': {
        if (!payload.automationId) {
          throw new BadRequestException('automationId is required for delete');
        }
        await this.deleteAutomation(ctx, pipeline, payload.automationId);
        break;
      }
      case 'toggle': {
        if (!payload.automationId) {
          throw new BadRequestException('automationId is required for toggle');
        }
        await this.toggleAutomation(ctx, pipeline, payload.automationId);
        break;
      }
      case 'test': {
        if (!payload.automation?.id && !payload.automationId) {
          throw new BadRequestException('automationId is required for test');
        }
        return { result: 'queued' };
      }
      default:
        throw new BadRequestException('Unsupported automation operation');
    }

    return this.requirePipeline(ctx, pipelineId, true);
  }

  async publish(
    ctx: RequestContext,
    pipelineId: string,
    dto: PublishPipelineDto
  ): Promise<{ status: 'validated' | 'published'; pipeline: PipelineWithDesignerRelations }> {
    const pipeline = await this.requirePipeline(ctx, pipelineId, true);
    if (pipeline.status !== PipelineStatus.DRAFT) {
      throw new BadRequestException('Only draft pipelines can be published');
    }

    this.assertStageIntegrity(pipeline.stages);
    this.assertFieldSetIntegrity(pipeline.fieldSets);
    this.assertAutomationIntegrity(pipeline.automations);

    if (dto.validateOnly) {
      return { status: 'validated', pipeline };
    }

    const now = new Date();

    const latestVersion = await this.prisma.pipeline.aggregate({
      where: { tenantId: ctx.tenantId, familyId: pipeline.familyId },
      _max: { version: true }
    });
    const nextVersion = (latestVersion._max.version ?? 0) + 1;

    const previousActive = await this.prisma.pipeline.findFirst({
      where: {
        tenantId: ctx.tenantId,
        familyId: pipeline.familyId,
        status: PipelineStatus.ACTIVE
      },
      select: { id: true }
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pipeline.updateMany({
        where: {
          tenantId: ctx.tenantId,
          familyId: pipeline.familyId,
          status: PipelineStatus.ACTIVE
        },
        data: { status: PipelineStatus.ARCHIVED, archivedAt: now }
      });

      const activated = await tx.pipeline.update({
        where: { id: pipeline.id },
        data: {
          status: PipelineStatus.ACTIVE,
          version: nextVersion,
          publishedAt: now,
          archivedAt: null,
          brokerageId: ctx.tenantId,
          isDefault: dto.assignDefault ?? pipeline.isDefault
        },
        include: this.defaultInclude()
      });

      if (dto.assignDefault) {
        await this.markDefault(tx, ctx.tenantId, activated.id);
      }

      if (dto.migration?.length) {
        await this.performMigration(
          tx,
          ctx,
          activated,
          dto.migration,
          previousActive?.id ?? null
        );
      }

      return activated;
    });

    await this.audit.log({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      object: 'pipeline',
      recordId: updated.id,
      action: AuditAction.UPDATE,
      diff: {
        status: updated.status,
        version: updated.version
      }
    });

    this.events.emit('pipeline.published', {
      tenantId: ctx.tenantId,
      pipelineId: updated.id,
      version: updated.version,
      assignDefault: dto.assignDefault ?? false
    });

    return { status: 'published', pipeline: updated };
  }

  async assign(
    ctx: RequestContext,
    pipelineId: string,
    dto: AssignPipelineDto
  ): Promise<{ updated: PipelineWithDesignerRelations; migration?: Record<string, number> }> {
    const pipeline = await this.requirePipeline(ctx, pipelineId, true);
    if (pipeline.status !== PipelineStatus.ACTIVE) {
      throw new BadRequestException('Only active pipelines can be assigned');
    }

    const migrationResult = dto.migration?.length
      ? await this.simulateMigration(ctx, pipeline, dto.migration)
      : undefined;

    if (dto.dryRun) {
      return { updated: pipeline, migration: migrationResult };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.setDefault) {
        await this.markDefault(tx, ctx.tenantId, pipeline.id);
      }

      if (dto.migration?.length) {
        await this.performMigration(tx, ctx, pipeline, dto.migration, pipeline.id);
      }

      return tx.pipeline.findUniqueOrThrow({
        where: { id: pipeline.id },
        include: this.defaultInclude()
      });
    });

    await this.audit.log({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      object: 'pipeline',
      recordId: updated.id,
      action: AuditAction.UPDATE,
      diff: {
        setDefault: dto.setDefault ?? false
      }
    });

    this.events.emit('pipeline.assigned', {
      tenantId: ctx.tenantId,
      pipelineId: updated.id,
      setDefault: dto.setDefault ?? false
    });

    return { updated, migration: migrationResult };
  }

  private defaultInclude() {
    return {
      stages: { orderBy: { order: 'asc' } },
      fieldSets: true,
      automations: true
    } as const;
  }

  private async requirePipeline(
    ctx: RequestContext,
    pipelineId: string,
    includeRelations = false
  ): Promise<PipelineWithDesignerRelations> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId: ctx.tenantId },
      include: includeRelations ? this.defaultInclude() : undefined
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    return pipeline as PipelineWithDesignerRelations;
  }

  private async resolveSourcePipeline(
    ctx: RequestContext,
    dto: CreatePipelineDto
  ): Promise<PipelineWithDesignerRelations | null> {
    if (dto.sourcePipelineId) {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: { id: dto.sourcePipelineId, tenantId: ctx.tenantId },
        include: this.defaultInclude()
      });
      if (!pipeline) {
        throw new NotFoundException('Source pipeline not found');
      }
      return pipeline;
    }

    if (dto.cloneFromActive) {
      const active = await this.prisma.pipeline.findFirst({
        where: { tenantId: ctx.tenantId, status: PipelineStatus.ACTIVE },
        orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
        include: this.defaultInclude()
      });
      return active;
    }

    return null;
  }

  private async nextPipelineOrder(tenantId: string) {
    const result = await this.prisma.pipeline.aggregate({
      where: { tenantId },
      _max: { order: true }
    });
    return (result._max.order ?? -1) + 1;
  }

  private async createStage(ctx: RequestContext, pipeline: Pipeline, dto: StagePayloadDto) {
    const targetOrder =
      dto.order ??
      ((await this.prisma.stage.aggregate({
        where: { pipelineId: pipeline.id, tenantId: ctx.tenantId },
        _max: { order: true }
      }))._max.order ?? -1) + 1;

    const exitReasons =
      dto.exitReasons && Array.isArray(dto.exitReasons)
        ? dto.exitReasons.map((reason) => ({ key: reason.key, label: reason.label }))
        : null;

    await this.prisma.stage.create({
      data: {
        tenantId: ctx.tenantId,
        pipelineId: pipeline.id,
        name: dto.name,
        order: targetOrder,
        probWin: dto.probWin ?? null,
        slaHours: dto.slaHours ?? null,
        slaMinutes: dto.slaMinutes ?? null,
        exitReasons: this.asNullableJson(exitReasons) as
          | Prisma.JsonNullValueInput
          | Prisma.InputJsonValue
      }
    });
  }

  private async updateStage(
    ctx: RequestContext,
    pipeline: Pipeline,
    stageId: string,
    dto: StagePayloadDto
  ) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const data: Prisma.StageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.probWin !== undefined) data.probWin = dto.probWin;
    if (dto.slaHours !== undefined) data.slaHours = dto.slaHours;
    if (dto.slaMinutes !== undefined) data.slaMinutes = dto.slaMinutes;
    if (dto.exitReasons !== undefined) {
      const updatedExitReasons =
        dto.exitReasons && Array.isArray(dto.exitReasons)
          ? dto.exitReasons.map((reason) => ({ key: reason.key, label: reason.label }))
          : null;
      data.exitReasons = this.asNullableJson(updatedExitReasons) as
        | Prisma.JsonNullValueInput
        | Prisma.InputJsonValue;
    }

    await this.prisma.stage.update({
      where: { id: stage.id },
      data
    });
  }

  private async deleteStage(ctx: RequestContext, pipeline: Pipeline, stageId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const leadCount = await this.prisma.person.count({
      where: { tenantId: ctx.tenantId, stageId: stage.id }
    });
    if (leadCount > 0) {
      throw new BadRequestException('Cannot delete a stage with assigned leads');
    }

    await this.prisma.stage.delete({ where: { id: stage.id } });
  }

  private async reorderStages(ctx: RequestContext, pipeline: Pipeline, order: string[]) {
    const stages = await this.prisma.stage.findMany({
      where: { pipelineId: pipeline.id, tenantId: ctx.tenantId },
      select: { id: true }
    });
    const stageSet = new Set(stages.map((s) => s.id));
    if (order.length !== stages.length) {
      throw new BadRequestException('stageOrder must include all stages');
    }
    for (const id of order) {
      if (!stageSet.has(id)) throw new BadRequestException(`Stage ${id} not part of pipeline`);
    }
    await this.prisma.$transaction(
      order.map((id, index) =>
        this.prisma.stage.update({
          where: { id },
          data: { order: index }
        })
      )
    );
  }

  private async updateFieldSet(
    ctx: RequestContext,
    pipeline: Pipeline,
    fieldSetId: string,
    dto: MutateFieldSetDto['fieldSet']
  ) {
    const fieldSet = await this.prisma.fieldSet.findFirst({
      where: { id: fieldSetId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!fieldSet) throw new NotFoundException('Field set not found');

    const nextUiSchema =
      dto?.uiSchema !== undefined
        ? dto.uiSchema === null
          ? Prisma.JsonNull
          : this.asJson(dto.uiSchema)
        : fieldSet.uiSchema ?? Prisma.JsonNull;
    const nextVisibility =
      dto?.visibility !== undefined
        ? dto.visibility === null
          ? Prisma.JsonNull
          : this.asJson(dto.visibility)
        : fieldSet.visibility ?? Prisma.JsonNull;

    await this.prisma.fieldSet.update({
      where: { id: fieldSet.id },
      data: {
        target: dto?.target ?? fieldSet.target,
        schema:
          dto?.schema !== undefined
            ? (this.asJson(dto.schema) as any)
            : (this.asJson(fieldSet.schema) as any),
        uiSchema: nextUiSchema as any,
        visibility: nextVisibility as any
      }
    });
  }

  private async deleteFieldSet(ctx: RequestContext, pipeline: Pipeline, fieldSetId: string) {
    const fieldSet = await this.prisma.fieldSet.findFirst({
      where: { id: fieldSetId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!fieldSet) throw new NotFoundException('Field set not found');
    await this.prisma.fieldSet.delete({ where: { id: fieldSet.id } });
  }

  private async updateAutomation(
    ctx: RequestContext,
    pipeline: Pipeline,
    automationId: string,
    dto: MutateAutomationDto['automation']
  ) {
    const automation = await this.prisma.pipelineAutomation.findFirst({
      where: { id: automationId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const nextTrigger =
      dto?.trigger !== undefined
        ? dto.trigger === null
          ? Prisma.JsonNull
          : this.asJson(dto.trigger)
        : automation.trigger ?? Prisma.JsonNull;
    const nextActions =
      dto?.actions !== undefined
        ? this.asJson(dto.actions.map((entry) => entry.definition))
        : automation.actions ?? Prisma.JsonNull;

    await this.prisma.pipelineAutomation.update({
      where: { id: automation.id },
      data: {
        name: dto?.name ?? automation.name,
        trigger: nextTrigger as any,
        actions: nextActions as any,
        isEnabled: dto?.isEnabled ?? automation.isEnabled
      }
    });
  }

  private async deleteAutomation(ctx: RequestContext, pipeline: Pipeline, automationId: string) {
    const automation = await this.prisma.pipelineAutomation.findFirst({
      where: { id: automationId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!automation) throw new NotFoundException('Automation not found');
    await this.prisma.pipelineAutomation.delete({ where: { id: automation.id } });
  }

  private async toggleAutomation(ctx: RequestContext, pipeline: Pipeline, automationId: string) {
    const automation = await this.prisma.pipelineAutomation.findFirst({
      where: { id: automationId, pipelineId: pipeline.id, tenantId: ctx.tenantId }
    });
    if (!automation) throw new NotFoundException('Automation not found');
    await this.prisma.pipelineAutomation.update({
      where: { id: automation.id },
      data: { isEnabled: !automation.isEnabled }
    });
  }

  private assertStageIntegrity(stages: Stage[]) {
    if (stages.length === 0) {
      throw new BadRequestException('At least one stage is required');
    }
    const names = new Set<string>();
    for (const stage of stages) {
      const normalized = stage.name.trim().toLowerCase();
      if (names.has(normalized)) {
        throw new BadRequestException(`Duplicate stage name: ${stage.name}`);
      }
      names.add(normalized);
    }
  }

  private assertFieldSetIntegrity(fieldSets: FieldSet[]) {
    for (const fieldSet of fieldSets) {
      if (!fieldSet.schema || typeof fieldSet.schema !== 'object') {
        throw new BadRequestException('Field set schema must be an object');
      }
    }
  }

  private assertAutomationIntegrity(automations: PipelineAutomation[]) {
    for (const automation of automations) {
      const actions = Array.isArray(automation.actions) ? automation.actions : [];
      if (actions.length === 0) {
        throw new BadRequestException('Automations must include at least one action');
      }
    }
  }

  private async markDefault(tx: Prisma.TransactionClient, tenantId: string, pipelineId: string) {
    await tx.pipeline.updateMany({
      where: { tenantId },
      data: { isDefault: false }
    });
    await tx.pipeline.update({
      where: { id: pipelineId },
      data: { isDefault: true }
    });
  }

  private async performMigration(
    tx: Prisma.TransactionClient,
    ctx: RequestContext,
    targetPipeline: PipelineWithDesignerRelations,
    mappings: StageMigrationMappingDto[],
    previousPipelineId: string | null
  ) {
    if (!mappings.length || !previousPipelineId) return;

    const targetStageMap = new Map(
      targetPipeline.stages.map((stage) => [stage.id, stage])
    );

    for (const mapping of mappings) {
      if (!targetStageMap.has(mapping.to)) {
        throw new BadRequestException(`Target stage ${mapping.to} not found on pipeline`);
      }
    }

    for (const mapping of mappings) {
      await tx.person.updateMany({
        where: {
          tenantId: ctx.tenantId,
          pipelineId: previousPipelineId,
          stageId: mapping.from
        },
        data: {
          pipelineId: targetPipeline.id,
          stageId: mapping.to
        }
      });
    }

    await tx.person.updateMany({
      where: {
        tenantId: ctx.tenantId,
        pipelineId: previousPipelineId,
        OR: [{ stageId: null }, { stageId: { notIn: mappings.map((m) => m.from) } }]
      },
      data: {
        pipelineId: targetPipeline.id,
        stageId: mappings[0]?.to ?? null
      }
    });
  }

  private async simulateMigration(
    ctx: RequestContext,
    pipeline: PipelineWithDesignerRelations,
    mappings: StageMigrationMappingDto[]
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const mapping of mappings) {
      const count = await this.prisma.person.count({
        where: {
          tenantId: ctx.tenantId,
          pipelineId: pipeline.id,
          stageId: mapping.from
        }
      });
      counts[mapping.from] = count;
    }
    return counts;
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private asNullableJson(value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
    return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}
