import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import type { ConsumerPortalConfig, ViewPreset } from '@prisma/client';

import { ConsumerPortalService } from './consumer-portal.service';
import { ConsumerPortalConfigDto } from './dto/config.dto';
import { RolesGuard } from '@/auth/roles.guard';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Controller('consumer-portal')
export class ConsumerPortalController {
  constructor(private readonly svc: ConsumerPortalService) {}

  @Get('config')
  get(@Query('brokerageId') brokerageId: string): Promise<ConsumerPortalConfig | null> {
    return this.svc.get(brokerageId);
  }

  @Put('config/:brokerageId')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  put(
    @Param('brokerageId') brokerageId: string,
    @Body() dto: ConsumerPortalConfigDto
  ): Promise<ConsumerPortalConfig> {
    return this.svc.put(brokerageId, dto);
  }

  @Get('views/:token')
  resolveView(@Param('token') token: string): Promise<ViewPreset | null> {
    return this.svc.resolveSharedView(token);
  }
}
