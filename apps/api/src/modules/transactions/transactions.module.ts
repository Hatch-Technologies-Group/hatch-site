import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [PrismaModule],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TransactionsService]
})
export class TransactionsModule {}

