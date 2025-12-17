import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

import { OrgListingContactType } from '@hatch/db';

export class AttachListingContactDto {
  @ApiProperty({ description: 'CRM contact/person id to attach to this listing' })
  @IsString()
  personId!: string;

  @ApiProperty({ enum: OrgListingContactType, description: 'Relationship between the contact and this listing' })
  @IsEnum(OrgListingContactType)
  type!: OrgListingContactType;
}

