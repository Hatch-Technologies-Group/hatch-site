import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFileMetadataDto {
  @ApiProperty({ example: 'Standard Purchase Contract' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, enum: ['CONTRACT_TEMPLATE','COMPLIANCE','TRAINING','MARKETING','RENTAL_PM','OTHER'] })
  @IsOptional()
  @IsEnum(['CONTRACT_TEMPLATE','COMPLIANCE','TRAINING','MARKETING','RENTAL_PM','OTHER'] as any)
  category?: 'CONTRACT_TEMPLATE' | 'COMPLIANCE' | 'TRAINING' | 'MARKETING' | 'RENTAL_PM' | 'OTHER';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiProperty({ required: false, description: 'Existing FileObject id to link' })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiProperty({ required: false, description: 'If you do not have fileId, you can supply storageKey to auto-create FileObject' })
  @IsOptional()
  @IsString()
  storageKey?: string;
}

