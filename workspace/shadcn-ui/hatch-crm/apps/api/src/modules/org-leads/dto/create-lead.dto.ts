import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  listingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
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

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  fbclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  anonymousId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  // Honeypot field (keep empty in legitimate submissions).
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  marketingConsentEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsentSms?: boolean;
}
