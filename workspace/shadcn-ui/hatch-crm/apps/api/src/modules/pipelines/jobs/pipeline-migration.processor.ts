import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AuditAction } from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';
import { AuditService } from '@/platform/audit/audit.service';
import { makeMigrationTarget } from '../adapters/factory';

type Payload = {
  pipelineId: string;
  mappings: Record<string, string>;
  previewOnly?: boolean;
  chunkSize?: number;
};

@Processor('pipeline-migrations')
export class PipelineMigrationProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    const target = makeMigrationTarget(this.prisma);
    const { pipelineId, mappings, previewOnly, chunkSize = 500 } = job.data as Payload;

    const pipelineContext = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } });
    const orgId = pipelineContext?.brokerageId ?? 'unknown';

    const stages = await this.prisma.stage.findMany({ where: { pipelineId } });
    const byName = new Map(stages.map((stage) => [stage.name, stage.id]));
    const missingTargets = Object.values(mappings).filter((name) => !byName.has(name));
    if (missingTargets.length > 0) {
      throw new Error(`Migration target stage(s) not found: ${missingTargets.join(', ')}`);
    }

    const items = await target.listItems(pipelineId);
    const counts: Record<string, number> = {};
    for (const key of Object.keys(mappings)) counts[key] = 0;
    for (const item of items) {
      if (!item.stageName) continue;
      if (mappings[item.stageName]) counts[item.stageName] += 1;
    }

    if (previewOnly) {
      await this.audit.log({
        orgId,
        recordId: pipelineId,
        object: 'pipeline_migration',
        action: AuditAction.UPDATE,
        diff: {
          preview: true,
          counts,
          total: items.length
        }
      });
      return { preview: true, counts, total: items.length };
    }

    const toStageId = (name: string) => byName.get(name)!;
    const candidates = items.filter((item) => item.stageName && mappings[item.stageName]);
    let processed = 0;

    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      await this.prisma.$transaction(async () => {
        for (const item of chunk) {
          await target.updateStage(item.id, toStageId(mappings[item.stageName!]));
        }
      });
      processed += chunk.length;
      const progress = Math.round((processed / candidates.length) * 100);
      await job.updateProgress(progress);
    }

    await this.audit.log({
      orgId,
      recordId: pipelineId,
      object: 'pipeline_migration',
      action: AuditAction.UPDATE,
      diff: {
        preview: false,
        mappings,
        impacted: candidates.length,
        total: items.length
      }
    });

    return { preview: false, impacted: candidates.length, total: items.length };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<Payload>, err: Error) {
    const pipelineContext = await this.prisma.pipeline.findUnique({ where: { id: job.data.pipelineId } });
    const orgId = pipelineContext?.brokerageId ?? 'unknown';

    await this.audit.log({
      orgId,
      recordId: job.data.pipelineId,
      object: 'pipeline_migration',
      action: AuditAction.UPDATE,
      diff: {
        jobId: job.id,
        error: err.message
      }
    });
  }
}
