import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePipelineDto {
  @IsString()
  brokerageId!: string;

  @IsString()
  name!: string;

  @IsString()
  useCase!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
