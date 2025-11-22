import { IsEnum } from 'class-validator'
import { DocumentReviewStatus } from '@hatch/db'

export class UpdateReviewStatusDto {
  @IsEnum(DocumentReviewStatus)
  status!: DocumentReviewStatus
}
