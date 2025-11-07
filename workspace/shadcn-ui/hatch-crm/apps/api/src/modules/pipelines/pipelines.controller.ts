import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';

import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { StageDto } from './dto/stage.dto';
import { FieldSetDto } from './dto/fieldset.dto';
import { AutomationDto } from './dto/automation.dto';
import { PublishDto } from './dto/publish.dto';
import { MigrationDto } from './dto/migrate.dto';
import { RolesGuard } from '@/auth/roles.guard';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly svc: PipelinesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  createDraft(@Body() dto: CreatePipelineDto): Promise<unknown> {
    return this.svc.createDraft(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  updateDraft(@Param('id') id: string, @Body() dto: UpdatePipelineDto): Promise<unknown> {
    return this.svc.updateDraft(id, dto);
  }

  @Post(':id/stages')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  upsertStages(@Param('id') id: string, @Body() stages: StageDto[]): Promise<unknown> {
    return this.svc.upsertStages(id, stages);
  }

  @Post(':id/field-sets')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  upsertFieldSets(@Param('id') id: string, @Body() sets: FieldSetDto[]): Promise<unknown> {
    return this.svc.upsertFieldSets(id, sets);
  }

  @Post(':id/automations')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  upsertAutomations(@Param('id') id: string, @Body() autos: AutomationDto[]): Promise<unknown> {
    return this.svc.upsertAutomations(id, autos);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  publish(@Param('id') id: string, @Body() dto: PublishDto): Promise<unknown> {
    return this.svc.publish(id, dto);
  }

  @Post(':id/migrate')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  migrate(
    @Param('id') id: string,
    @Body() dto: MigrationDto,
    @Query('preview') preview?: string
  ): Promise<unknown> {
    return this.svc.enqueueMigration(id, { ...dto, previewOnly: preview === '1' || dto.previewOnly });
  }

  @Get()
  list(@Query('brokerageId') brokerageId: string): Promise<unknown> {
    return this.svc.list(brokerageId);
  }
}
