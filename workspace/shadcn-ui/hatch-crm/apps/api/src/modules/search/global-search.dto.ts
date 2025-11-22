import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GlobalSearchQueryDto {
  @ApiProperty({ description: 'Search query', example: 'Naples open house' })
  @IsString()
  @MaxLength(200)
  q!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamId?: string;
}

export class GlobalSearchResultDto {
  @ApiProperty({ example: 'listing' })
  type!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  subtitle?: string;

  @ApiProperty({ required: false })
  route?: string;

  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;
}

export class GlobalSearchResponseDto {
  @ApiProperty()
  query!: string;

  @ApiProperty({ type: [GlobalSearchResultDto] })
  results!: GlobalSearchResultDto[];

  @ApiProperty({ required: false })
  aiSummary?: {
    summary: string;
    recommendations?: string[];
  };
}
