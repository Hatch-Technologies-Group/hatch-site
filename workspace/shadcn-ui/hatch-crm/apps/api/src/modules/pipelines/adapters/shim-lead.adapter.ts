import type { PrismaService } from '@/shared/prisma.service';
import type { MigrationTarget } from '../migration-target';

export class ShimLeadAdapter implements MigrationTarget {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(pipelineId: string) {
    const rows = await this.prisma.person.findMany({
      where: { pipelineId },
      select: { id: true, pipelineStage: { select: { name: true } } }
    });
    return rows.map((row) => ({ id: row.id, stageName: row.pipelineStage?.name ?? null }));
  }

  async updateStage(id: string, newStageId: string) {
    await this.prisma.person.update({ where: { id }, data: { stageId: newStageId } });
  }

  async countByStage(pipelineId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ name: string | null; cnt: bigint }>>`
      select s."name" as name, count(*)::bigint as cnt
      from "Person" p
      left join "Stage" s on s."id" = p."stageId"
      where p."pipelineId" = ${pipelineId}
      group by s."name"
    `;
    const out: Record<string, number> = {};
    for (const row of rows) {
      if (!row.name) continue;
      out[row.name] = Number(row.cnt);
    }
    return out;
  }
}
