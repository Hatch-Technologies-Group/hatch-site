import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertAgentProfileDto {
  @ApiProperty({ description: 'Agent user ID within the org' })
  @IsString()
  userId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  licenseState?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  licenseExpiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCommercial?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isResidential?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

