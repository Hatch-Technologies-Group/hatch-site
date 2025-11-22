import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { SearchModule } from '@/modules/search/search.module'
import { TimelineModule } from '@/modules/timelines/timeline.module'
import { PlaybooksModule } from '@/modules/playbooks/playbooks.module'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'

@Module({
  imports: [PrismaModule, AiEmployeesModule, SearchModule, TimelineModule, PlaybooksModule],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService]
})
export class ChatModule {}
