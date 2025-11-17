import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Subset of Twilio status callback fields we care about
export class TwilioStatusCallbackDto {
  @ApiProperty({ description: 'Twilio Message SID' })
  @IsString()
  MessageSid!: string;

  @ApiProperty({ description: 'Current message status', example: 'sent|delivered|failed|undelivered' })
  @IsString()
  MessageStatus!: string;

  @ApiProperty({ description: 'Recipient phone number (E.164)' })
  @IsString()
  To!: string;

  @ApiProperty({ description: 'Sender phone number (E.164)' })
  @IsString()
  From!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ErrorCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ErrorMessage?: string;
}

