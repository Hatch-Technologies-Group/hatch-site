import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateTrainingModuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orgFileId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalUrl?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number | null;
}

