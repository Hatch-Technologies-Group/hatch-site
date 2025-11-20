import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgTransactionDocumentType } from '@hatch/db';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AttachTransactionDocumentDto {
  @ApiProperty({ description: 'OrgFile id to link' })
  @IsString()
  orgFileId!: string;

  @ApiPropertyOptional({ enum: OrgTransactionDocumentType })
  @IsOptional()
  @IsEnum(OrgTransactionDocumentType)
  type?: OrgTransactionDocumentType;
}
