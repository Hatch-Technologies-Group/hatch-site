import { IsString } from 'class-validator';

export class SaveListingDto {
  @IsString()
  searchIndexId!: string;
}
