export class AiAnswerDto {
  answer!: string;
  suggestions?: string[];
  references?: Array<{
    type: string;
    id?: string;
  }>;
}
