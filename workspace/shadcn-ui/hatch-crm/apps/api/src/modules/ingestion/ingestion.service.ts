import { BadRequestException, Injectable } from '@nestjs/common';

import { S3Service } from '@/modules/storage/s3.service';
import { OrgVaultService } from '@/modules/org-vault/org-vault.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { DocumentsAiService } from '@/modules/documents-ai/documents-ai.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly s3: S3Service,
    private readonly orgVault: OrgVaultService,
    private readonly prisma: PrismaService,
    private readonly documentsAi: DocumentsAiService
  ) {}

  async ingestLawDoc(params: {
    url: string;
    title: string;
    jurisdiction?: string;
    category?: string;
    organizationId?: string;
    uploadedByUserId?: string;
  }) {
    const orgId = this.resolveOrgId(params.organizationId);
    const userId = this.resolveUserId(params.uploadedByUserId);
    const jurisdiction = (params.jurisdiction ?? 'general').toLowerCase();
    const safeTitle = this.sanitizeFileName(params.title);
    const normalizedTitle = safeTitle.toLowerCase().endsWith('.pdf') ? safeTitle : `${safeTitle}.pdf`;
    const key = `laws/${jurisdiction}/${Date.now()}-${normalizedTitle}`;
    const descriptionParts = [] as string[];
    if (params.jurisdiction) {
      descriptionParts.push(`Jurisdiction: ${params.jurisdiction}`);
    }
    if (params.category) {
      descriptionParts.push(`Category: ${params.category}`);
    }
    const description = descriptionParts.length ? descriptionParts.join(' | ') : undefined;

    await this.s3.uploadFromUrl(key, params.url, 'application/pdf');

    const orgFile = await this.orgVault.createFileMetadata(
      orgId,
      userId,
      {
        name: params.title,
        description,
        category: 'OTHER',
        storageKey: key
      },
      { skipMembershipCheck: true }
    );

    const knowledgeDoc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: orgId,
        orgFileId: orgFile.id,
        title: params.title,
        s3Key: key,
        source: 'LAW'
      }
    });

    void this.documentsAi
      .indexKnowledgeDocument(knowledgeDoc)
      .catch(() => undefined);

    return { organizationId: orgId, storageKey: key, knowledgeDocumentId: knowledgeDoc.id };
  }

  async ingestContractFromUrl(params: {
    organizationId: string;
    transactionId?: string;
    listingId?: string;
    url: string;
    originalFileName: string;
    externalSource?: string;
    uploadedByUserId?: string;
  }) {
    const orgId = this.resolveOrgId(params.organizationId);
    const userId = this.resolveUserId(params.uploadedByUserId);
    const safeName = this.sanitizeFileName(params.originalFileName);
    const txSegment = params.transactionId ? `tx-${params.transactionId}` : 'no-tx';
    const key = `contracts/org-${orgId}/${txSegment}/${Date.now()}-${safeName}`;

    await this.s3.uploadFromUrl(key, params.url);

    await this.orgVault.createFileMetadata(
      orgId,
      userId,
      {
        name: params.originalFileName,
        description: params.externalSource ? `Imported from ${params.externalSource}` : undefined,
        category: 'OTHER',
        storageKey: key,
        transactionId: params.transactionId,
        listingId: params.listingId
      },
      { skipMembershipCheck: true }
    );

    return { storageKey: key };
  }

  async ingestDataFile(params: { prefix: string; url: string; originalFileName: string }) {
    const normalizedPrefix = this.normalizePrefix(params.prefix);
    if (!['batchdata', 'mls-raw'].includes(normalizedPrefix)) {
      throw new BadRequestException('Unsupported prefix; expected batchdata or mls-raw');
    }

    const safeName = this.sanitizeFileName(params.originalFileName);
    const key = `${normalizedPrefix}/${Date.now()}-${safeName}`;

    await this.s3.uploadFromUrl(key, params.url, 'application/json');

    return { storageKey: key };
  }

  private sanitizeFileName(value: string) {
    return value.trim().replace(/[\s/\\]+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private normalizePrefix(prefix: string) {
    return prefix.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private resolveOrgId(orgId?: string) {
    const resolved = orgId ?? process.env.INGESTION_DEFAULT_ORG_ID;
    if (!resolved) {
      throw new BadRequestException('organizationId is required for ingestion');
    }
    return resolved;
  }

  private resolveUserId(userId?: string) {
    const resolved = userId ?? process.env.INGESTION_DEFAULT_USER_ID;
    if (!resolved) {
      throw new BadRequestException('INGESTION_DEFAULT_USER_ID is not configured');
    }
    return resolved;
  }
}
