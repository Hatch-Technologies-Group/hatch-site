import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AgentProfilesService } from './agent-profiles.service';
import { AgentProfilesController } from './agent-profiles.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => OnboardingModule)],
  providers: [AgentProfilesService],
  controllers: [AgentProfilesController],
  exports: [AgentProfilesService]
})
export class AgentProfilesModule {}
