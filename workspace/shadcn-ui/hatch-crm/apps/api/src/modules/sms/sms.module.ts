import { Module } from '@nestjs/common';

import { MessagesModule } from '../messages/messages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsController } from './sms.controller';

@Module({
  imports: [MessagesModule, PrismaModule],
  controllers: [SmsController]
})
export class SmsModule {}

