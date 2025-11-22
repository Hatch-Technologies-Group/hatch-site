import { IsArray, IsOptional, IsString } from 'class-validator'

export class CreateTeamDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  officeId?: string

  @IsOptional()
  @IsArray()
  leaderIds?: string[]

  @IsOptional()
  @IsArray()
  memberIds?: string[]
}
