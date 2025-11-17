import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Subset of Twilio's incoming webhook fields we care about
export class TwilioInboundSmsDto {
  @ApiProperty({ description: 'Twilio Message SID' })
  @IsString()
  MessageSid!: string;

  @ApiProperty({ description: 'Sender phone number (E.164)' })
  @IsString()
  From!: string;

  @ApiProperty({ description: 'Recipient phone number (E.164)' })
  @IsString()
  To!: string;

  @ApiProperty({ description: 'Message text body' })
  @IsString()
  Body!: string;

  @ApiProperty({ required: false, description: 'Optional tenant slug for multi-tenant routing' })
  @IsOptional()
  @IsString()
  tenant?: string;
}

