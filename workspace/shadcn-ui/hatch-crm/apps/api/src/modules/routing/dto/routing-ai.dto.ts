import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { RoutingMode } from '@hatch/db';

export class RoutingRuleDraftRequestDto {
  @ApiProperty({ description: 'Natural language description of the desired routing rule.' })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ enum: RoutingMode, description: 'Force a routing mode for the generated rule.' })
  @IsOptional()
  @IsEnum(RoutingMode)
  mode?: RoutingMode;

  @ApiPropertyOptional({ description: 'Default team target to use when the prompt does not specify one.' })
  @IsOptional()
  @IsString()
  defaultTeamId?: string;

  @ApiPropertyOptional({ description: 'Fallback pond/team id if no eligible agent is found.' })
  @IsOptional()
  @IsString()
  fallbackTeamId?: string;

  @ApiPropertyOptional({
    description:
      'When enabled, routing may ignore strict agent filters when no specialists are available.'
  })
  @IsOptional()
  @IsBoolean()
  relaxAgentFilters?: boolean;
}

export class RoutingRuleDraftDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  priority!: number;

  @ApiProperty({ enum: RoutingMode })
  mode!: RoutingMode;

  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true })
  conditions?: Record<string, unknown> | null;

  @ApiProperty({ type: Object, isArray: true })
  targets!: Record<string, unknown>[];

  @ApiPropertyOptional({ type: Object, nullable: true })
  fallback?: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  slaFirstTouchMinutes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  slaKeptAppointmentMinutes?: number | null;

  @ApiPropertyOptional({ type: [String] })
  warnings?: string[];
}
