import { IsOptional, IsString } from 'class-validator';

export class EvaluateFileDto {
  @IsString()
  fileId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
