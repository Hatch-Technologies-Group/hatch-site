import { Injectable } from '@nestjs/common';
import { AccountingProvider } from '@hatch/db';

type AccountingPayloadType = 'TRANSACTION' | 'RENTAL_LEASE';

interface SendToAccountingParams {
  orgId: string;
  provider: AccountingProvider;
  realmId?: string | null;
  type: AccountingPayloadType;
  data: Record<string, unknown>;
}

interface SendToAccountingResult {
  success: boolean;
  externalId?: string;
  errorMessage?: string;
}

@Injectable()
export class IntegrationService {
  async sendToAccounting(params: SendToAccountingParams): Promise<SendToAccountingResult> {
    const externalId = `${params.provider.toLowerCase()}_${params.type.toLowerCase()}_${Date.now()}`;
    return { success: true, externalId };
  }
}
