import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
type StatusType = (typeof statuses)[number];

export class UpdateTrainingProgressDto {
  @ApiProperty({ required: false, enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: StatusType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  completedAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

