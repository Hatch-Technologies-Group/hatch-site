import { IsEnum } from 'class-validator';

export class UpdateAgentTaskStatusDto {
  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'])
  status!: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
}
