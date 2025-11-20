import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgTransactionsController } from './org-transactions.controller';
import { OrgTransactionsService } from './org-transactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrgTransactionsController],
  providers: [OrgTransactionsService],
  exports: [OrgTransactionsService]
})
export class OrgTransactionsModule {}
