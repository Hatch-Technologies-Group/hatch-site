import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOfferIntentDto {
  @IsString()
  listingId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offeredPrice?: number;

  @IsOptional()
  @IsString()
  financingType?: string;

  @IsOptional()
  @IsString()
  closingTimeline?: string;

  @IsOptional()
  @IsString()
  contingencies?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
