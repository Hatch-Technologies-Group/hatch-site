import { IsString } from 'class-validator';

export class AssignLeadDto {
  @IsString()
  agentProfileId!: string;
}
