import { Module } from '@nestjs/common';

import { CommissionPlansController } from './commission-plans.controller';
import { CommissionPlansService } from './commission-plans.service';
import { CapLedgerService } from './cap-ledger.service';

@Module({
  controllers: [CommissionPlansController],
  providers: [CommissionPlansService, CapLedgerService],
  exports: [CommissionPlansService, CapLedgerService]
})
export class CommissionPlansModule {}
