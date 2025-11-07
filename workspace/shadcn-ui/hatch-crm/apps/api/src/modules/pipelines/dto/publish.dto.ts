import { IsBoolean, IsOptional } from 'class-validator';

export class PublishDto {
  @IsOptional()
  @IsBoolean()
  setDefault?: boolean;
}
