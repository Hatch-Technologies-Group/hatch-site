import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ConsumerPreferencesService } from './consumer-preferences.service';
import { ConsumerPreferencesController } from './consumer-preferences.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, NotificationsModule, MailModule],
  providers: [ConsumerPreferencesService],
  controllers: [ConsumerPreferencesController],
  exports: [ConsumerPreferencesService]
})
export class ConsumerPreferencesModule {}
