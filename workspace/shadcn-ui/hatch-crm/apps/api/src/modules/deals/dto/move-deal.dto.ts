import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MoveDealDto {
  @IsString()
  @IsNotEmpty()
  toStageId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
