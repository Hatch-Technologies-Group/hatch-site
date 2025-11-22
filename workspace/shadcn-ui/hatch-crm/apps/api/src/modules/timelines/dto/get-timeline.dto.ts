import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsString } from 'class-validator'

const ENTITY_TYPES = ['listing', 'lead', 'transaction', 'rental'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export class GetTimelineParamsDto {
  @ApiProperty({ enum: ENTITY_TYPES })
  @IsString()
  @IsIn(ENTITY_TYPES)
  entityType!: EntityType

  @ApiProperty()
  @IsString()
  entityId!: string
}

export interface TimelineEntry {
  ts: string
  source: string
  eventType: string
  summary: string
  metadata?: Record<string, unknown> | null
}

export interface TimelineResponse {
  entityId: string
  entityType: EntityType
  timeline: TimelineEntry[]
}
