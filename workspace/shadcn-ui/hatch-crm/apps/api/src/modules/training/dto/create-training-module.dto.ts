import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateTrainingModuleDto {
  @ApiProperty({ example: 'MLS Rules 101' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, description: 'OrgFile id for attached content' })
  @IsOptional()
  @IsString()
  orgFileId?: string;

  @ApiProperty({ required: false, description: 'External URL to content' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false, description: 'Estimated completion time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

