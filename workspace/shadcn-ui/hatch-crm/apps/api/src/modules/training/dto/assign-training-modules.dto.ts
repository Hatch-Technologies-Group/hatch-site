import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignTrainingModulesDto {
  @ApiProperty({ description: 'Agent profile id' })
  @IsString()
  agentProfileId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  moduleIds!: string[];
}

