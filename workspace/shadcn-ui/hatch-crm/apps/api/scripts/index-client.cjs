#!/usr/bin/env node
const { PrismaClient } = require('@hatch/db');
const { IngestService } = require('../src/modules/search/ingest.service');
const { EmbeddingsService } = require('../src/modules/ai/embeddings.service');

async function main() {
  const [, , tenantId, entityType = 'client', entityId] = process.argv;
  if (!tenantId || !entityId) {
    console.error('Usage: node -r esbuild-register apps/api/scripts/index-client.cjs <tenantId> <entityType> <entityId>');
    process.exit(1);
  }
  if (!['client', 'lead'].includes(entityType)) {
    console.error('entityType must be "client" or "lead"');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const embeddings = new EmbeddingsService();
  const ingest = new IngestService(prisma, embeddings);

  try {
    const result = await ingest.indexEntity({ tenantId, entityType, entityId });
    console.log('Indexed', { tenantId, entityType, entityId, ...result });
  } catch (error) {
    console.error('Failed to index client notes', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
