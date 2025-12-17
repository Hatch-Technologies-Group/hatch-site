import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

import { RoutingMode } from '@hatch/db';

export class CreateRoutingRuleDto {
  @IsString()
  name!: string;

  @IsInt()
  priority!: number;

  @IsEnum(RoutingMode)
  mode!: RoutingMode;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsArray()
  targets!: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  fallback?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  slaFirstTouchMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(10080)
  slaKeptAppointmentMinutes?: number;
}
