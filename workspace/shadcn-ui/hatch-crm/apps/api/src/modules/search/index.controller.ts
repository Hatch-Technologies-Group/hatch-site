import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

import { IndexerProducer } from './indexer.queue';

@Controller('index')
@UseGuards(JwtAuthGuard)
export class IndexController {
  constructor(private readonly producer: IndexerProducer) {}

  @Post('entity')
  async indexEntity(
    @Body() body: { entityType: 'client' | 'lead'; entityId: string },
    @Req() req: any
  ) {
    const tenantId = req.user?.tenantId;
    await this.producer.enqueue({
      tenantId,
      entityType: body.entityType,
      entityId: body.entityId
    });
    return { ok: true, queued: body };
  }
}
