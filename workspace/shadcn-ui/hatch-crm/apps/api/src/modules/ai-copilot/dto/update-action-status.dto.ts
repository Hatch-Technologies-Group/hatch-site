import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateActionStatusDto {
  @IsEnum(['SUGGESTED', 'ACCEPTED', 'DISMISSED', 'COMPLETED'])
  status!: 'SUGGESTED' | 'ACCEPTED' | 'DISMISSED' | 'COMPLETED';

  @IsOptional()
  @IsString()
  note?: string;
}
