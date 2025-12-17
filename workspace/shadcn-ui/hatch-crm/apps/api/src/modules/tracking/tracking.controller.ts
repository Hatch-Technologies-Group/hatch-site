import { Body, Controller, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';

import { ApiModule, ApiStandardErrors } from '../common';
import { TrackEventDto } from './dto/track-event.dto';
import { TrackingService } from './tracking.service';

@ApiModule('Tracking')
@ApiStandardErrors()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post('events')
  @ApiBody({ type: TrackEventDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] },
        eventId: { type: 'string' }
      }
    }
  })
  async track(@Body() dto: TrackEventDto, @Req() req: FastifyRequest) {
    return this.tracking.trackEvent(dto, req);
  }
}

