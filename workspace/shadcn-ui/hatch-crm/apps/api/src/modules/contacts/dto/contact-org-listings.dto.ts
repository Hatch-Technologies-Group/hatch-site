import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { OrgListingContactType } from '@hatch/db';

export class AttachOrgListingToContactDto {
  @ApiProperty({ description: 'Org listing id to attach to this contact' })
  @IsString()
  orgListingId!: string;

  @ApiProperty({ enum: OrgListingContactType, description: 'Relationship between the contact and this property' })
  @IsEnum(OrgListingContactType)
  type!: OrgListingContactType;
}

export class ListContactOrgListingsQueryDto {
  @ApiProperty({ required: false, enum: OrgListingContactType })
  @IsOptional()
  @IsEnum(OrgListingContactType)
  type?: OrgListingContactType;
}

