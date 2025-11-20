import { IsString } from 'class-validator';

export class SyncTransactionDto {
  @IsString()
  transactionId!: string;
}
