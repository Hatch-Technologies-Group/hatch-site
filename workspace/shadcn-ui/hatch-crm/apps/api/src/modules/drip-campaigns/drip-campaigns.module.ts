import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { PlaybooksModule } from '@/modules/playbooks/playbooks.module'
import { DripCampaignsService } from './drip-campaigns.service'
import { DripCampaignsController } from './drip-campaigns.controller'
import { DripRunnerService } from './drip-runner.service'

@Module({
  imports: [PrismaModule, PlaybooksModule],
  providers: [DripCampaignsService, DripRunnerService],
  controllers: [DripCampaignsController],
  exports: [DripCampaignsService, DripRunnerService]
})
export class DripCampaignsModule {}
