import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { AiCopilotService } from './ai-copilot.service';
import { GetAgentBriefingDto } from './dto/get-agent-briefing.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

@Controller('organizations/:orgId/ai-copilot')
@UseGuards(JwtAuthGuard)
export class AiCopilotController {
  constructor(private readonly service: AiCopilotService) {}

  @Post('daily-briefing')
  getDailyBriefing(@Param('orgId') orgId: string, @Body() dto: GetAgentBriefingDto, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.service.getOrGenerateDailyBriefing(orgId, userId, dto);
  }

  @Get('actions')
  listActions(@Param('orgId') orgId: string, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.service.listActionsForAgent(orgId, userId);
  }

  @Patch('actions/:actionId/status')
  updateActionStatus(
    @Param('orgId') orgId: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateActionStatusDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.service.updateActionStatus(orgId, userId, actionId, dto);
  }
}
