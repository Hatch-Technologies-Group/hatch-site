import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AgentProfilesModule } from '../agent-profiles/agent-profiles.module';
import { TrainingModule } from '../training/training.module';
import { OrgVaultModule } from '../org-vault/org-vault.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AgentProfilesModule),
    TrainingModule,
    OrgVaultModule,
    OrgEventsModule
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService]
})
export class OnboardingModule {}
