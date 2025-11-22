import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AiModule } from '@/modules/ai/ai.module';
import { OrgEventsModule } from '@/modules/org-events/org-events.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module';
import { TimelineModule } from '@/modules/timelines/timeline.module';
import { AiBrokerService } from './ai-broker.service';
import { AiBrokerController } from './ai-broker.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    OrgEventsModule,
    OnboardingModule,
    AiEmployeesModule,
    NotificationsModule,
    MailModule,
    TimelineModule
  ],
  controllers: [AiBrokerController],
  providers: [AiBrokerService],
  exports: [AiBrokerService]
})
export class AiBrokerModule {}
