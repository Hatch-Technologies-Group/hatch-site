import { IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

export class TrackEventDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsString()
  anonymousId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

