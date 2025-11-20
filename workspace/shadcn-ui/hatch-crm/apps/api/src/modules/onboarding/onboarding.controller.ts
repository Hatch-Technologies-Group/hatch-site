import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OnboardingService } from './onboarding.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { GenerateOnboardingTasksDto } from './dto/generate-onboarding-tasks.dto';
import { UpdateAgentTaskStatusDto } from './dto/update-agent-task-status.dto';

interface AuthedRequest {
  user?: { userId?: string; sub?: string };
}

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller()
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  private getUserId(req: AuthedRequest) {
    return req.user?.userId ?? req.user?.sub;
  }

  @Post('organizations/:orgId/onboarding/workflow-templates')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  createTemplate(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateWorkflowTemplateDto
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.createWorkflowTemplate(orgId, userId, dto);
  }

  @Patch('organizations/:orgId/onboarding/workflow-templates/:templateId')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  updateTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateWorkflowTemplateDto
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.updateWorkflowTemplate(orgId, userId, templateId, dto);
  }

  @Get('organizations/:orgId/onboarding/workflow-templates')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  listTemplates(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Query('type') type?: 'ONBOARDING' | 'OFFBOARDING'
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.listWorkflowTemplates(orgId, userId, type);
  }

  @Post('organizations/:orgId/onboarding/generate')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  generateTasks(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: GenerateOnboardingTasksDto
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.manualGenerateOnboardingTasks(orgId, userId, dto);
  }

  @Get('organizations/:orgId/onboarding/agents/:agentProfileId/tasks')
  @UseGuards(JwtAuthGuard)
  listAgentTasks(
    @Param('orgId') orgId: string,
    @Param('agentProfileId') agentProfileId: string,
    @Req() req: AuthedRequest,
    @Query('type') type?: 'ONBOARDING' | 'OFFBOARDING'
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.listAgentTasks(orgId, userId, agentProfileId, type);
  }

  @Patch('organizations/:orgId/onboarding/tasks/:taskId/status')
  @UseGuards(JwtAuthGuard)
  updateTaskStatus(
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateAgentTaskStatusDto
  ) {
    const userId = this.getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.onboarding.updateAgentTaskStatus(orgId, userId, taskId, dto);
  }
}
