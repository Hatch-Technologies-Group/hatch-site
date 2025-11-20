import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AiBrokerService } from './ai-broker.service';
import { AskBrokerAssistantDto } from './dto/ask-broker-assistant.dto';
import { EvaluateComplianceDto } from './dto/evaluate-compliance.dto';

interface AuthedRequest {
  user?: { userId?: string; sub?: string };
}

@ApiTags('ai-broker')
@ApiBearerAuth()
@Controller('organizations/:orgId/ai-broker')
export class AiBrokerController {
  constructor(private readonly service: AiBrokerService) {}

  @Post('ask')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  askBrokerAssistant(@Param('orgId') orgId: string, @Body() dto: AskBrokerAssistantDto, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.service.askBrokerAssistant(orgId, userId, dto);
  }

  @Post('evaluate-compliance')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  @HttpCode(200)
  evaluateCompliance(
    @Param('orgId') orgId: string,
    @Body() dto: EvaluateComplianceDto,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.service.evaluateCompliance(orgId, userId, dto);
  }
}
