import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgLeadsModule } from '../org-leads/org-leads.module';
import { LeadGenController } from './lead-gen.controller';
import { LeadGenPublicController } from './lead-gen-public.controller';
import { LeadGenService } from './lead-gen.service';

@Module({
  imports: [PrismaModule, OrgLeadsModule],
  controllers: [LeadGenController, LeadGenPublicController],
  providers: [LeadGenService],
  exports: [LeadGenService]
})
export class LeadGenModule {}

