import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from '../storage/s3.service';
import { MarketingStudioController } from './marketing-studio.controller';
import { MarketingStudioService } from './marketing-studio.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingStudioController],
  providers: [MarketingStudioService, S3Service],
  exports: [MarketingStudioService]
})
export class MarketingStudioModule {}

