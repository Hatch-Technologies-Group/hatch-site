import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  imports: [PrismaModule],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService]
})
export class ListingsModule {}

