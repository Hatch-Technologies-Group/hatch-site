import { Module } from '@nestjs/common';

import { SearchModule } from '@/modules/search/search.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';

import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { CopilotController } from './copilot.controller';
import { AiPersonasService } from './personas/ai-personas.service';
import { AiPersonaRouterService } from './personas/ai-personas.router';
import { AiPersonasController } from './personas/ai-personas.controller';
import { AiEmailDraftService } from './ai-email.service';

@Module({
  imports: [SearchModule, PrismaModule],
  controllers: [AiController, CopilotController, AiPersonasController],
  providers: [AiService, AiPersonasService, AiPersonaRouterService, AiEmailDraftService],
  exports: [AiService, AiPersonasService, AiEmailDraftService]
})
export class AiModule {}
