import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

import { SemanticSearchService } from './semantic.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SemanticSearchController {
  constructor(private readonly service: SemanticSearchService) {}

  @Get('semantic')
  async semantic(
    @Query('q') q: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit = '5',
    @Req() req: any
  ) {
    const tenantId = req.user?.tenantId;
    if (!q || !q.trim()) {
      return { items: [] };
    }

    const maxTopK = Number(process.env.AI_RAG_TOPK || 5);
    const items = await this.service.search({
      tenantId,
      query: q,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      limit: Number(limit) || maxTopK
    });

    return { items };
  }
}
