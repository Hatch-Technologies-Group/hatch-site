import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDirectConversationDto {
  @ApiProperty({ description: 'Other user ID in the same org' })
  @IsString()
  otherUserId!: string;
}

