import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AttachTransactionDocumentDto {
  @ApiProperty()
  @IsString()
  orgFileId!: string;

  @ApiProperty({ required: false, enum: ['EXECUTED_CONTRACT','ADDENDUM','INSPECTION_REPORT','APPRAISAL','CLOSING_DISCLOSURE','OTHER'] })
  @IsOptional()
  @IsString()
  type?: 'EXECUTED_CONTRACT' | 'ADDENDUM' | 'INSPECTION_REPORT' | 'APPRAISAL' | 'CLOSING_DISCLOSURE' | 'OTHER';
}

