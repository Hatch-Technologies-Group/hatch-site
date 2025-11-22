import { IsString } from 'class-validator';

export class ClassifyFileDto {
  @IsString()
  fileId!: string;
}
