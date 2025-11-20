import { IsString } from 'class-validator';

export class SyncRentalLeaseDto {
  @IsString()
  leaseId!: string;
}
