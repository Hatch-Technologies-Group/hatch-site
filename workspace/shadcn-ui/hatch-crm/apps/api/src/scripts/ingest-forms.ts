import { NestFactory } from '@nestjs/core';
import path from 'path';
import fs from 'fs';

import { AppModule } from '@/app.module';
import { IngestionService } from '@/modules/ingestion/ingestion.service';

type FormEntry = {
  title: string;
  jurisdiction: string;
  s3Key: string;
};

async function loadManifest(): Promise<FormEntry[]> {
  const manifestPath = path.resolve(__dirname, '../../scripts/forms-manifest.json');
  const raw = await fs.promises.readFile(manifestPath, 'utf-8');
  return JSON.parse(raw) as FormEntry[];
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestion = app.get(IngestionService);
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? 'us-east-2';
  const orgId = process.env.INGESTION_DEFAULT_ORG_ID;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }
  if (!orgId) {
    throw new Error('INGESTION_DEFAULT_ORG_ID is required');
  }

  const manifest = await loadManifest();
  for (const form of manifest) {
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${form.s3Key}`;
    // Reuse ingestLawDoc so KnowledgeDocument + OrgFile + indexing is triggered.
    await ingestion.ingestLawDoc({
      url,
      title: form.title,
      jurisdiction: form.jurisdiction,
      organizationId: orgId
    });
    // eslint-disable-next-line no-console
    console.log(`Ingested form: ${form.title}`);
  }

  await app.close();
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
