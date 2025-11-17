import { Module } from '@nestjs/common';

import { CommissionPlansModule } from '../../commission-plans/commission-plans.module';
import { PayoutsModule } from '../../payouts/payouts.module';
import { OutboxModule } from '../../outbox/outbox.module';
import { AiEmployeesModule } from '../../ai-employees/ai-employees.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [CommissionPlansModule, PayoutsModule, OutboxModule, AiEmployeesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService]
})
export class TransactionsModule {}
