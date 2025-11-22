import { Module, forwardRef } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { MailModule } from '@/modules/mail/mail.module'
import { PlaybooksService } from './playbooks.service'
import { PlaybookRunnerService } from './playbook-runner.service'
import { PlaybooksController } from './playbooks.controller'
import { PlaybooksAiController } from './playbooks-ai.controller'

@Module({
  imports: [PrismaModule, NotificationsModule, MailModule, forwardRef(() => AiEmployeesModule)],
  controllers: [PlaybooksController, PlaybooksAiController],
  providers: [PlaybooksService, PlaybookRunnerService],
  exports: [PlaybooksService, PlaybookRunnerService]
})
export class PlaybooksModule {}
