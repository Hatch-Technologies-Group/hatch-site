import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAgentComplianceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @ApiProperty({ required: false, enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsString()
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  riskScore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  riskFlags?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  ceCycleStartAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  ceCycleEndAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  ceHoursRequired?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  ceHoursCompleted?: number;
}

