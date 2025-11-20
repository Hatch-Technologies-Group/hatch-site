import { IsIn, IsOptional, IsString } from 'class-validator';

const OFFER_STATUS_VALUES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const;

export class UpdateOfferIntentStatusDto {
  @IsIn(OFFER_STATUS_VALUES)
  status!: (typeof OFFER_STATUS_VALUES)[number];

  @IsOptional()
  @IsString()
  transactionId?: string | null;
}
