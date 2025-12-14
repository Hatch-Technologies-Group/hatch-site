import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateAgentPortalConfigDto {
  @ApiProperty({
    example: ['/broker/crm', '/broker/contracts', '/broker/transactions'],
    isArray: true
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedPaths!: string[];

  @IsOptional()
  @IsString()
  landingPath?: string;
}

