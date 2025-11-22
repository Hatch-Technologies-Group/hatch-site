import { Controller, HttpCode, Post, SetMetadata, UseGuards } from '@nestjs/common';

import { RolesGuard } from '@/auth/roles.guard';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { BatchService } from './batch.service';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('admin/batch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('sync')
  @HttpCode(200)
  @Roles('admin', 'owner')
  async triggerSync() {
    const result = await this.batchService.syncEvents();
    return {
      status: 'ok',
      ...result
    };
  }
}
