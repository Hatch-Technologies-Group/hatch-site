import { IsOptional, IsString } from 'class-validator'

export class CreateOfficeDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  region?: string
}
