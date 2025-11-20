import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  conversationId!: string;

  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

