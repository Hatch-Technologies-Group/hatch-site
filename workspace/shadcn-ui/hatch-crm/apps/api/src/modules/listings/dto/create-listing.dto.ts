import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentProfileId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mlsNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  listPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  squareFeet?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

