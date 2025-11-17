import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { resolveRequestContext } from '../common/request-context';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import type { ClientAnalyticsEventPayload } from './types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  @UseGuards(JwtAuthGuard)
  trackEvent(@Body() dto: TrackEventDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    const payload: ClientAnalyticsEventPayload = {
      ...dto,
      tenantId: dto.tenantId ?? ctx.tenantId,
      userId: dto.userId ?? ctx.userId,
      receivedAt: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    this.analytics.emit('client.analytics.event', payload);

    return { status: 'ok' };
  }
}
