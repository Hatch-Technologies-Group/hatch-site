import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactConsentDto {
  @ApiProperty()
  sms!: boolean;

  @ApiProperty()
  email!: boolean;

  @ApiProperty()
  call!: boolean;
}

export class ContactListItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  ownerId?: string | null;

  @ApiPropertyOptional()
  teamId?: string | null;

  @ApiPropertyOptional()
  companyId?: string | null;

  @ApiPropertyOptional()
  companyName?: string | null;

  @ApiPropertyOptional()
  householdId?: string | null;

  @ApiPropertyOptional()
  householdName?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  score?: number | null;

  @ApiPropertyOptional()
  source?: string | null;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  lastActivityAt?: string | null;

  @ApiProperty()
  openTasks!: number;

  @ApiProperty({ type: ContactConsentDto })
  consent!: ContactConsentDto;

  @ApiProperty()
  dnc!: boolean;
}

export class ContactOwnerDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;
}

export class ContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  primaryEmail?: string | null;

  @ApiPropertyOptional()
  primaryPhone?: string | null;

  @ApiPropertyOptional()
  stage?: string | null;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[] | null;

  @ApiProperty()
  doNotContact!: boolean;

  @ApiPropertyOptional({ type: ContactOwnerDto })
  owner?: ContactOwnerDto | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SavedViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: Object })
  filters?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  query?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  isDefault?: boolean | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ContactListResponseDto {
  @ApiProperty({ type: ContactListItemDto, isArray: true })
  rows!: ContactListItemDto[];

  @ApiPropertyOptional({ description: 'Opaque cursor to retrieve the next page', nullable: true })
  nextCursor?: string | null;

  @ApiPropertyOptional({ type: SavedViewDto, nullable: true })
  savedView?: SavedViewDto | null;
}

export class ContactTimelineEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiPropertyOptional({ description: 'Event payload (structure varies per event)' })
  payload?: Record<string, unknown>;
}

export class ContactDetailsDto extends ContactSummaryDto {
  @ApiPropertyOptional({ type: [String] })
  secondaryEmails?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  secondaryPhones?: string[] | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: Object, description: 'Flexible client profile fields (key/value map)' })
  customFields?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: ContactTimelineEntryDto, isArray: true })
  timeline?: ContactTimelineEntryDto[];
}
