import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AttachListingDocumentDto {
  @ApiProperty()
  @IsString()
  orgFileId!: string;

  @ApiProperty({ required: false, enum: ['LISTING_AGREEMENT','DISCLOSURE','PHOTOS','OTHER'] })
  @IsOptional()
  @IsString()
  type?: 'LISTING_AGREEMENT' | 'DISCLOSURE' | 'PHOTOS' | 'OTHER';
}

