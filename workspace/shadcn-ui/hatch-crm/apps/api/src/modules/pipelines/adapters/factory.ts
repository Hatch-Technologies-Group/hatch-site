import type { PrismaService } from '@/shared/prisma.service';
import type { MigrationTarget } from '../migration-target';
import { ShimLeadAdapter } from './shim-lead.adapter';

export function makeMigrationTarget(prisma: PrismaService): MigrationTarget {
  switch ((process.env.MIGRATION_TARGET ?? 'shim_lead').toLowerCase()) {
    case 'shim_lead':
      return new ShimLeadAdapter(prisma);
    default:
      return new ShimLeadAdapter(prisma);
  }
}
