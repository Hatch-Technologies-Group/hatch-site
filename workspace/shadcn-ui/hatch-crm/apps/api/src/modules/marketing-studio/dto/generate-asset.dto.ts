import { IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateMarketingStudioAssetDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  text?: Record<string, string>;

  @IsOptional()
  @IsObject()
  images?: Record<string, { url?: string; s3Key?: string }>;
}

