import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAgentProfileAdminDto {
  @ApiProperty({ required: false, description: 'Lifecycle stage for the agent (ONBOARDING, ACTIVE, OFFBOARDING)' })
  @IsOptional()
  @IsString()
  lifecycleStage?: string;

  @ApiProperty({ required: false, description: 'Assign the agent to an office (nullable to clear)' })
  @IsOptional()
  @IsString()
  officeId?: string | null;

  @ApiProperty({ required: false, description: 'Assign the agent to a team (nullable to clear)' })
  @IsOptional()
  @IsString()
  teamId?: string | null;

  @ApiProperty({ required: false, type: [String], description: 'Agent tags (empty array clears tags)' })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Structured routing metadata stored under agentProfile.metadata.routingProfile (nullable clears routingProfile).'
  })
  @IsOptional()
  @IsObject()
  routingProfile?: Record<string, unknown> | null;
}
