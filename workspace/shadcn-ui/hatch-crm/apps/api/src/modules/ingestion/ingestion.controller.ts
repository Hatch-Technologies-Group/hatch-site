import { Body, Controller, NotFoundException, Post } from '@nestjs/common';

import { IngestionService } from './ingestion.service';

const ensureDev = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new NotFoundException('Ingestion dev endpoints are disabled in production');
  }
};

@Controller('dev/ingest')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('law')
  async ingestLaw(
    @Body()
    body: {
      url: string;
      title: string;
      jurisdiction?: string;
      organizationId?: string;
      uploadedByUserId?: string;
    }
  ) {
    ensureDev();
    return this.ingestion.ingestLawDoc(body);
  }

  @Post('contract')
  async ingestContract(
    @Body()
    body: {
      organizationId: string;
      transactionId?: string;
      listingId?: string;
      url: string;
      originalFileName: string;
      externalSource?: string;
      uploadedByUserId?: string;
    }
  ) {
    ensureDev();
    return this.ingestion.ingestContractFromUrl(body);
  }

  @Post('data')
  async ingestData(@Body() body: { prefix: string; url: string; originalFileName: string }) {
    ensureDev();
    return this.ingestion.ingestDataFile(body);
  }
}
