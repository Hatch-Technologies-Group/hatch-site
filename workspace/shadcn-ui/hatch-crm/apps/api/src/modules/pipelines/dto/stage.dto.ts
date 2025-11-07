import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StageDto {
  @IsString()
  name!: string;

  @IsInt()
  order!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probWin?: number;

  @IsOptional()
  exitReasons?: unknown;

  @IsOptional()
  @IsInt()
  slaHours?: number;
}
