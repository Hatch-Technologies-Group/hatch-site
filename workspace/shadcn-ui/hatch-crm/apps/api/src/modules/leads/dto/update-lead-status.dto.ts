import { IsIn, IsOptional, IsString } from 'class-validator';

const LEAD_STATUS_VALUES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'APPOINTMENT_SET',
  'UNDER_CONTRACT',
  'CLOSED'
] as const;

export class UpdateLeadStatusDto {
  @IsIn(LEAD_STATUS_VALUES)
  status!: (typeof LEAD_STATUS_VALUES)[number];

  @IsOptional()
  @IsString()
  agentProfileId?: string | null;
}
