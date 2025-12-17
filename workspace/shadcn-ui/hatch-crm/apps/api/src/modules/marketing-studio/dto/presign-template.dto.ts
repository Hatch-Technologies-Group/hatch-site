import { IsOptional, IsString } from 'class-validator';

export class PresignMarketingStudioTemplateDto {
  @IsString()
  fileName!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

