import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrgTransactionStatus } from '@hatch/db';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: OrgTransactionStatus })
  @IsOptional()
  @IsEnum(OrgTransactionStatus)
  status?: OrgTransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerName?: string | null;

  @ApiPropertyOptional({ description: 'ISO date or null to clear' })
  @IsOptional()
  @IsString()
  contractSignedAt?: string | null;

  @ApiPropertyOptional({ description: 'ISO date or null to clear' })
  @IsOptional()
  @IsString()
  inspectionDate?: string | null;

  @ApiPropertyOptional({ description: 'ISO date or null to clear' })
  @IsOptional()
  @IsString()
  financingDate?: string | null;

  @ApiPropertyOptional({ description: 'ISO date or null to clear' })
  @IsOptional()
  @IsString()
  closingDate?: string | null;

  @ApiPropertyOptional({ description: 'Broker-only compliance flag' })
  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;

  @ApiPropertyOptional({ description: 'Broker-only requires action flag' })
  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @ApiPropertyOptional({ description: 'Broker-only notes' })
  @IsOptional()
  @IsString()
  complianceNotes?: string | null;
}
