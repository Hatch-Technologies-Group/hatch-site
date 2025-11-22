import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateCommentDto {
  @IsString()
  content!: string

  @IsOptional()
  @IsInt()
  pageNumber?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  x?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  y?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  width?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  height?: number
}
