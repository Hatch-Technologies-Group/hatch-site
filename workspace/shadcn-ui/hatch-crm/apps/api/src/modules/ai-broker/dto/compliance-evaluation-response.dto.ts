export class ComplianceEvaluationResponseDto {
  riskLevel!: 'LOW' | 'MEDIUM' | 'HIGH';
  summary?: string;
  issues: Array<{
    code?: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    relatedEntity?: {
      type: 'LISTING' | 'TRANSACTION' | 'AGENT' | 'DOCUMENT';
      id?: string;
    };
  }> = [];
  recommendations?: string[];
}
