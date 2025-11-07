import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StartJourneyDto {
  @ApiProperty({ description: 'Lead identifier to enroll' })
  @IsString()
  leadId!: string;

  @ApiProperty({ description: 'Journey template identifier' })
  @IsString()
  templateId!: string;

  @ApiProperty({ description: 'Source of the trigger', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}
