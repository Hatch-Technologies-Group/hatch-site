import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ example: 'Contracts' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

