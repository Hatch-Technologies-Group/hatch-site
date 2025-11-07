import { IsBoolean, IsOptional } from 'class-validator';

export class AutomationDto {
  trigger!: unknown;

  actions!: unknown[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
