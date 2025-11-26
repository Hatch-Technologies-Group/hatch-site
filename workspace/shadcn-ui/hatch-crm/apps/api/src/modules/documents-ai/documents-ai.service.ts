import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ComplianceStatus, DocumentType, KnowledgeDocument, OrgEventType, OrgFile, PlaybookTriggerType } from '@hatch/db';
import pdfParseModule from 'pdf-parse';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service';
import { AuditService } from '@/modules/audit/audit.service';
import { OrgEventsService } from '@/modules/org-events/org-events.service';
import { PlaybookRunnerService } from '@/modules/playbooks/playbook-runner.service';
import { S3Service } from '@/modules/storage/s3.service';
import { SearchVectorService } from '@/modules/search/search-vector.service';

type OrgFileWithRelations = OrgFile & {
  file?: { fileName: string; mimeType: string | null; byteSize: number; storageKey: string } | null;
  listing?: { id: string; organizationId: string } | null;
  transaction?: { id: string; organizationId: string } | null;
  lease?: { id: string; organizationId: string } | null;
};

type PdfParseFn = (data: Buffer) => Promise<{ text?: string }>;
const pdfParseFn: PdfParseFn | undefined =
  (pdfParseModule as unknown as { default?: PdfParseFn }).default ??
  ((pdfParseModule as unknown as PdfParseFn) || undefined);

const REQUIRED_DOCS: Record<'listing' | 'transaction' | 'lease', DocumentType[]> = {
  listing: [DocumentType.LISTING_CONTRACT, DocumentType.DISCLOSURE, DocumentType.ADDENDUM],
  transaction: [
    DocumentType.PURCHASE_CONTRACT,
    DocumentType.ADDENDUM,
    DocumentType.CLOSING_DOC,
    DocumentType.PROOF_OF_FUNDS
  ],
  lease: [DocumentType.RENTAL_AGREEMENT, DocumentType.TAX_DOC]
};

@Injectable()
export class DocumentsAiService {
  private readonly logger = new Logger(DocumentsAiService.name);
  private readonly maxPreviewBytes = Number(process.env.DOCUMENT_AI_MAX_PREVIEW_BYTES ?? 10 * 1024 * 1024); // 10MB
  private readonly maxPreviewChars = Number(process.env.DOCUMENT_AI_MAX_PREVIEW_CHARS ?? 12000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly audit: AuditService,
    private readonly events: OrgEventsService,
    private readonly playbooks: PlaybookRunnerService,
    private readonly s3: S3Service,
    private readonly searchVectors: SearchVectorService
  ) {}

  async analyzeFile(orgId: string, fileId: string) {
    try {
      await this.classifyFile(orgId, fileId);
    } catch (error) {
      this.logger.warn(`document classification failed for ${fileId}: ${(error as Error).message}`);
    }

    try {
      await this.evaluateFile(orgId, fileId);
    } catch (error) {
      this.logger.warn(`document compliance evaluation failed for ${fileId}: ${(error as Error).message}`);
    }
  }

  async classifyFile(orgId: string, fileId: string) {
    const record = await this.loadFile(orgId, fileId);
    const fileText = await this.extractFileText(record);
    const metadata = this.buildFileInput(record, fileText);
    const aiResult = await this.aiEmployees.runPersona('docClassifier', {
      organizationId: orgId,
      userId: record.uploadedByUserId,
      input: metadata
    });

    const nextType = this.normalizeDocumentType(aiResult.structured?.documentType ?? aiResult.rawText);
    const updated = await this.prisma.orgFile.update({
      where: { id: record.id },
      data: { documentType: nextType }
    });

    await this.audit.log({
      organizationId: orgId,
      userId: record.uploadedByUserId ?? null,
      actionType: 'OTHER',
      summary: `Document ${record.name} classified as ${nextType}`,
      metadata: { fileId: record.id, documentType: nextType }
    });

    await this.events.logOrgEvent({
      organizationId: orgId,
      actorId: record.uploadedByUserId ?? undefined,
      type: OrgEventType.ORG_FILE_CLASSIFIED,
      message: `Document "${record.name}" classified as ${nextType}`,
      payload: { fileId: record.id, documentType: nextType }
    });

    return updated;
  }

  async evaluateFile(orgId: string, fileId: string) {
    const record = await this.loadFile(orgId, fileId);
    const entityType = this.resolveEntityType(record);
    const input = {
      ...this.buildFileInput(record, await this.extractFileText(record)),
      entityType
    };

    const aiResult = await this.aiEmployees.runPersona('docComplianceChecker', {
      organizationId: orgId,
      userId: record.uploadedByUserId,
      listingId: record.listingId ?? undefined,
      transactionId: record.transactionId ?? undefined,
      leaseId: record.leaseId ?? undefined,
      input
    });

    const nextStatus = this.normalizeComplianceStatus(
      aiResult.structured?.complianceStatus ?? aiResult.structured?.status ?? aiResult.rawText
    );
    const issues = aiResult.structured?.issues ?? aiResult.structured?.summary ?? aiResult.rawText ?? null;

    const updated = await this.prisma.orgFile.update({
      where: { id: record.id },
      data: { complianceStatus: nextStatus }
    });

    await this.audit.log({
      organizationId: orgId,
      userId: record.uploadedByUserId ?? null,
      actionType: 'OTHER',
      summary: `Document ${record.name} compliance evaluated as ${nextStatus}`,
      metadata: { fileId: record.id, complianceStatus: nextStatus, issues }
    });

    await this.events.logOrgEvent({
      organizationId: orgId,
      actorId: record.uploadedByUserId ?? undefined,
      type: OrgEventType.ORG_FILE_EVALUATED,
      message: `Document "${record.name}" evaluated (${nextStatus})`,
      payload: { fileId: record.id, complianceStatus: nextStatus, issues }
    });

    await this.refreshLinkedEntities(orgId, record.id, record);

    void this.playbooks
      .runTrigger(orgId, PlaybookTriggerType.DOCUMENT_EVALUATED, {
        fileId: record.id,
        complianceStatus: nextStatus,
        listingId: record.listingId,
        transactionId: record.transactionId,
        leaseId: record.leaseId
      })
      .catch(() => undefined);

    return updated;
  }

  async refreshFile(orgId: string, fileId: string) {
    await this.evaluateFile(orgId, fileId);
  }

  async extractTextFromOrgFile(orgFileId: string): Promise<string> {
    const record = await this.loadFileById(orgFileId);
    const text = await this.extractFileText(record);
    if (!text) {
      throw new NotFoundException('OrgFile content not available');
    }
    return text;
  }

  async indexOrgFileForSearch(orgId: string, orgFileId: string) {
    const record = await this.loadFile(orgId, orgFileId);
    const text = await this.extractFileText(record);
    const contentParts = [record.name, record.description ?? '', text ?? ''].filter((part) => part && part.trim().length);
    const content = this.truncateText(contentParts.join('\n').trim());
    if (!content) {
      return;
    }
    await this.searchVectors.index({
      organizationId: orgId,
      entityType: 'document',
      entityId: record.id,
      content
    });
  }

  async indexKnowledgeDocument(doc: KnowledgeDocument | string) {
    const record =
      typeof doc === 'string'
        ? await this.prisma.knowledgeDocument.findUnique({ where: { id: doc } })
        : doc;
    if (!record) {
      throw new NotFoundException('KnowledgeDocument not found');
    }
    const text = await this.readObjectText(record.s3Key);
    const content = this.truncateText([record.title, text ?? ''].filter(Boolean).join('\n').trim());
    if (!content) {
      return;
    }
    await this.searchVectors.index({
      organizationId: record.organizationId,
      entityType: 'knowledge_doc',
      entityId: record.id,
      content
    });
  }

  private async refreshLinkedEntities(orgId: string, fileId: string, cached?: OrgFileWithRelations) {
    const file = cached ?? (await this.loadFile(orgId, fileId));
    if (file.listingId) {
      await this.refreshListingCompliance(orgId, file.listingId);
    }
    if (file.transactionId) {
      await this.refreshTransactionCompliance(orgId, file.transactionId);
    }
    if (file.leaseId) {
      await this.refreshLeaseCompliance(orgId, file.leaseId);
    }
  }

  private async refreshListingCompliance(orgId: string, listingId: string) {
    await this.prisma.orgFile.count({ where: { orgId, listingId } });
  }

  private async refreshTransactionCompliance(orgId: string, transactionId: string) {
    const docs = await this.prisma.orgFile.findMany({
      where: { orgId, transactionId },
      select: { documentType: true, complianceStatus: true }
    });
    const summary = this.buildComplianceSummary('transaction', docs);
    await this.prisma.orgTransaction.update({
      where: { id: transactionId },
      data: {
        isCompliant: summary.passed,
        requiresAction: !summary.passed,
        complianceNotes: summary.note ?? undefined
      }
    });
  }

  private async refreshLeaseCompliance(orgId: string, leaseId: string) {
    const docs = await this.prisma.orgFile.findMany({
      where: { orgId, leaseId },
      select: { documentType: true, complianceStatus: true }
    });
    const summary = this.buildComplianceSummary('lease', docs);
    await this.prisma.rentalLease.update({
      where: { id: leaseId },
      data: {
        isCompliant: summary.passed,
        complianceNotes: summary.note ?? undefined
      }
    });
  }

  private async extractFileText(file: OrgFileWithRelations): Promise<string | null> {
    const storageKey = file.file?.storageKey;
    if (!storageKey) {
      return null;
    }
    const text = await this.readObjectText(storageKey, file.file?.mimeType ?? undefined);
    return this.truncateText(text);
  }

  private async readObjectText(storageKey: string, mimeType?: string | null): Promise<string | null> {
    try {
      const stream = await this.s3.getObjectStream(storageKey);
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of stream as any as AsyncIterable<Buffer>) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);
        total += buf.length;
        if (this.maxPreviewBytes > 0 && total > this.maxPreviewBytes) {
          const allowed = Math.max(0, buf.length - (total - this.maxPreviewBytes));
          if (allowed > 0) {
            chunks.push(buf.slice(0, allowed));
          }
          break;
        }
        chunks.push(buf);
      }
      if (!chunks.length) {
        return null;
      }
      const buffer = Buffer.concat(chunks);
      if (mimeType?.toLowerCase().includes('pdf') && pdfParseFn) {
        try {
          const parsed = await pdfParseFn(buffer);
          if (parsed?.text) {
            const cleaned = this.sanitizeText(parsed.text);
            if (cleaned) {
              return cleaned;
            }
          }
        } catch (error) {
          this.logger.warn(`pdf parse failed for ${storageKey}: ${(error as Error).message}`);
        }
      }
      return this.sanitizeText(buffer.toString('utf-8'));
    } catch (error) {
      this.logger.warn(`s3 read failed for ${storageKey}: ${(error as Error).message}`);
      return null;
    }
  }

  private truncateText(value?: string | null) {
    if (!value) return null;
    if (this.maxPreviewChars > 0 && value.length > this.maxPreviewChars) {
      return value.slice(0, this.maxPreviewChars);
    }
    return value;
  }

  private sanitizeText(value?: string | null): string | null {
    if (!value) return null;
    const cleaned = value
      // Drop control chars and other binary noise.
      .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ')
      // Collapse whitespace.
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private buildComplianceSummary(
    entity: 'listing' | 'transaction' | 'lease',
    docs: Array<{ documentType: DocumentType; complianceStatus: ComplianceStatus }>
  ) {
    const required = REQUIRED_DOCS[entity];
    const docMap = new Map<DocumentType, ComplianceStatus>();
    for (const doc of docs) {
      docMap.set(doc.documentType, doc.complianceStatus);
    }
    let pending = 0;
    let failed = 0;
    for (const requirement of required) {
      if (!docMap.has(requirement)) {
        pending += 1;
        continue;
      }
      const status = docMap.get(requirement);
      if (status === ComplianceStatus.FAILED || status === ComplianceStatus.NEEDS_REVIEW) {
        failed += 1;
      } else if (status === ComplianceStatus.PENDING || status === ComplianceStatus.UNKNOWN) {
        pending += 1;
      }
    }
    const passed = failed === 0 && pending === 0;
    const note = failed > 0 ? `${failed} required document(s) flagged` : pending > 0 ? 'Documents pending review' : null;
    return { passed, pending, failed, note };
  }

  private buildFileInput(file: OrgFileWithRelations, contentPreview?: string | null) {
    return {
      fileId: file.id,
      name: file.name,
      description: file.description ?? null,
      category: file.category,
      storageKey: file.file?.storageKey ?? null,
      originalFileName: file.file?.fileName ?? null,
      mimeType: file.file?.mimeType ?? null,
      byteSize: file.file?.byteSize ?? null,
      documentType: file.documentType,
      linkedListingId: file.listingId ?? null,
      linkedTransactionId: file.transactionId ?? null,
      linkedLeaseId: file.leaseId ?? null,
      contentPreview: contentPreview ?? null
    };
  }

  private normalizeDocumentType(value?: string | null): DocumentType {
    if (!value) return DocumentType.UNKNOWN;
    const normalized = value.toString().trim().toUpperCase();
    const match = (Object.keys(DocumentType) as Array<keyof typeof DocumentType>).find(
      (key) => key === normalized
    );
    if (match) {
      return DocumentType[match];
    }
    return DocumentType.UNKNOWN;
  }

  private normalizeComplianceStatus(value?: string | null): ComplianceStatus {
    if (!value) return ComplianceStatus.UNKNOWN;
    const normalized = value.toString().trim().toUpperCase();
    const match = (Object.keys(ComplianceStatus) as Array<keyof typeof ComplianceStatus>).find(
      (key) => key === normalized
    );
    if (match) {
      return ComplianceStatus[match];
    }
    return ComplianceStatus.UNKNOWN;
  }

  private resolveEntityType(record: OrgFileWithRelations) {
    if (record.transactionId) return 'transaction';
    if (record.leaseId) return 'lease';
    if (record.listingId) return 'listing';
    return null;
  }

  private async loadFileById(fileId: string): Promise<OrgFileWithRelations> {
    const file = await this.prisma.orgFile.findUnique({
      where: { id: fileId },
      include: {
        file: { select: { fileName: true, mimeType: true, byteSize: true, storageKey: true } },
        listing: { select: { id: true, organizationId: true } },
        transaction: { select: { id: true, organizationId: true } },
        lease: { select: { id: true, organizationId: true } }
      }
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  private async loadFile(orgId: string, fileId: string): Promise<OrgFileWithRelations> {
    const file = await this.prisma.orgFile.findFirst({
      where: { id: fileId, orgId },
      include: {
        file: { select: { fileName: true, mimeType: true, byteSize: true, storageKey: true } },
        listing: { select: { id: true, organizationId: true } },
        transaction: { select: { id: true, organizationId: true } },
        lease: { select: { id: true, organizationId: true } }
      }
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }
}
