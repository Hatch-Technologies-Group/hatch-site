import { MarketingStudioTemplateVariant } from '@hatch/db';
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateMarketingStudioTemplateDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MarketingStudioTemplateVariant)
  variant?: MarketingStudioTemplateVariant;

  @IsOptional()
  @IsString()
  overlayS3Key?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  overlayPageIndex?: number;

  @IsObject()
  schema!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

