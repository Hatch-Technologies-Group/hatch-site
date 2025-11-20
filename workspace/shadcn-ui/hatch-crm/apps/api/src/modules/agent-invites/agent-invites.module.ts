import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AgentInvitesService } from './agent-invites.service';
import { AgentInvitesController } from './agent-invites.controller';
import { TokensService } from '../../platform/auth/tokens.service';

@Module({
  imports: [PrismaModule, OrgEventsModule, OnboardingModule],
  providers: [AgentInvitesService, TokensService],
  controllers: [AgentInvitesController]
})
export class AgentInvitesModule {}
