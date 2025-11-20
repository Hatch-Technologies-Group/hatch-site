import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ConsumerPreferencesService } from './consumer-preferences.service';
import { ConsumerPreferencesController } from './consumer-preferences.controller';

@Module({
  imports: [PrismaModule],
  providers: [ConsumerPreferencesService],
  controllers: [ConsumerPreferencesController],
  exports: [ConsumerPreferencesService]
})
export class ConsumerPreferencesModule {}
