import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpsertDelegationDto {
  @IsString()
  agentId!: string

  @IsString()
  assistantId!: string

  @IsOptional()
  @IsBoolean()
  canManageListings?: boolean

  @IsOptional()
  @IsBoolean()
  canManageLeads?: boolean

  @IsOptional()
  @IsBoolean()
  canManageTransactions?: boolean

  @IsOptional()
  @IsBoolean()
  canManageRentals?: boolean

  @IsOptional()
  @IsBoolean()
  canManageTasks?: boolean

  @IsOptional()
  @IsBoolean()
  canViewFinancials?: boolean

  @IsOptional()
  @IsBoolean()
  canChangeCompliance?: boolean
}
