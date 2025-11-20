import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgListingDocumentType } from '@hatch/db';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AttachListingDocumentDto {
  @ApiProperty({ description: 'OrgFile id to attach' })
  @IsString()
  orgFileId!: string;

  @ApiPropertyOptional({ enum: OrgListingDocumentType })
  @IsOptional()
  @IsEnum(OrgListingDocumentType)
  type?: OrgListingDocumentType;
}
