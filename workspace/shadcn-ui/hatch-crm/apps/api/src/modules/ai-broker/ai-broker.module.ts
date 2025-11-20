import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AiModule } from '@/modules/ai/ai.module';
import { OrgEventsModule } from '@/modules/org-events/org-events.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AiBrokerService } from './ai-broker.service';
import { AiBrokerController } from './ai-broker.controller';

@Module({
  imports: [PrismaModule, AiModule, OrgEventsModule, OnboardingModule],
  controllers: [AiBrokerController],
  providers: [AiBrokerService],
  exports: [AiBrokerService]
})
export class AiBrokerModule {}
