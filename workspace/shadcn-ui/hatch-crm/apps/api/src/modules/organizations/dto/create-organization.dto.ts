import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name', example: 'Acme Realty' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'Optional URL-friendly slug', required: false, example: 'acme-realty' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}

