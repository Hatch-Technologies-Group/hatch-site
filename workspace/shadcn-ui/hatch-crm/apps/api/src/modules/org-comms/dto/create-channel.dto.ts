import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, enum: ['ORG_WIDE', 'PRIVATE'] })
  @IsOptional()
  @IsString()
  visibility?: 'ORG_WIDE' | 'PRIVATE';
}

