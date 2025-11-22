import { IsOptional, IsString, IsObject } from 'class-validator';

export class RunPersonaDto {
  @IsOptional()
  @IsString()
  agentProfileId?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, any>;
}
