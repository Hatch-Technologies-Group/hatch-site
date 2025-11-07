import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { ViewPreset } from '@prisma/client';

import { ViewsService } from './views.service';
import { ViewDto } from './dto/view.dto';
import { RolesGuard } from '@/auth/roles.guard';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Controller('views')
export class ViewsController {
  constructor(private readonly svc: ViewsService) {}

  @Get()
  list(@Query('brokerageId') brokerageId: string): Promise<ViewPreset[]> {
    return this.svc.list(brokerageId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  create(@Body() dto: ViewDto): Promise<ViewPreset> {
    return this.svc.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  update(@Param('id') id: string, @Body() dto: Partial<ViewDto>): Promise<ViewPreset> {
    return this.svc.update(id, dto);
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  setDefault(@Param('id') id: string, @Query('role') role: string): Promise<{ ok: true } | null> {
    return this.svc.setDefault(id, role);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  share(@Param('id') id: string): Promise<{ token: string }> {
    return this.svc.share(id);
  }
}
