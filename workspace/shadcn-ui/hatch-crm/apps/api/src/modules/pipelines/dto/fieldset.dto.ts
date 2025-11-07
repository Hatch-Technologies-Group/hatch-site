import { IsIn, IsOptional } from 'class-validator';

export class FieldSetDto {
  @IsIn(['lead', 'opportunity', 'property', 'transaction'])
  target!: string;

  schema!: unknown;

  @IsOptional()
  uiSchema?: unknown;

  @IsOptional()
  visibility?: unknown;
}
