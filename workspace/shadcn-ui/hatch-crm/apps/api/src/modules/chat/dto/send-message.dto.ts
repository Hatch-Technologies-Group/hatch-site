import { IsString } from 'class-validator'

export class SendMessageDto {
  @IsString()
  content!: string

  @IsString()
  sessionId!: string
}
