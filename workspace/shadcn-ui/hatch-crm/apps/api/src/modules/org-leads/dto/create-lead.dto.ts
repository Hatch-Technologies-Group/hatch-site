import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  desiredMoveIn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;
}
