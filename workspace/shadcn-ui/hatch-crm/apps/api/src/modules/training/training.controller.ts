import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { TrainingService } from './training.service';
import { CreateTrainingModuleDto } from './dto/create-training-module.dto';
import { UpdateTrainingModuleDto } from './dto/update-training-module.dto';
import { AssignTrainingModulesDto } from './dto/assign-training-modules.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('training')
@ApiBearerAuth()
@Controller('organizations/:orgId/training')
export class TrainingController {
  constructor(private readonly svc: TrainingService) {}

  @Post('modules')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  createModule(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateTrainingModuleDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createTrainingModule(orgId, userId, dto);
  }

  @Patch('modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  updateModule(
    @Param('orgId') orgId: string,
    @Param('moduleId') moduleId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateTrainingModuleDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.updateTrainingModule(orgId, userId, moduleId, dto);
  }

  @Get('modules')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  listModules(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listTrainingModulesForOrg(orgId, userId);
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  assignModules(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: AssignTrainingModulesDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.assignModulesToAgent(orgId, userId, dto);
  }

  @Patch('agents/:agentProfileId/modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  updateProgress(
    @Param('orgId') orgId: string,
    @Param('agentProfileId') agentProfileId: string,
    @Param('moduleId') moduleId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateTrainingProgressDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.updateAgentTrainingProgress(orgId, userId, agentProfileId, moduleId, dto);
  }

  @Get('agents/:agentProfileId/progress')
  @UseGuards(JwtAuthGuard)
  listProgress(@Param('orgId') orgId: string, @Param('agentProfileId') agentProfileId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listAgentTrainingProgress(orgId, userId, agentProfileId);
  }
}

