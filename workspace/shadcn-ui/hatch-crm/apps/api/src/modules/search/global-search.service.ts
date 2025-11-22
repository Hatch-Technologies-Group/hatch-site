import { Injectable } from '@nestjs/common';
import { Prisma } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { EmbeddingsService } from '@/modules/ai/embeddings.service';
import { GlobalSearchQueryDto, GlobalSearchResponseDto, GlobalSearchResultDto } from './global-search.dto';

type Scope = { officeId?: string; teamId?: string };

@Injectable()
export class GlobalSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService
  ) {}

  async search(orgId: string, query: GlobalSearchQueryDto): Promise<GlobalSearchResponseDto> {
    const term = query.q?.trim();
    if (!term) {
      return { query: '', results: [] };
    }
    const scope: Scope = { officeId: query.officeId, teamId: query.teamId };

    const [leads, listings, transactions, rentals, agents, documents, vectors] = await Promise.all([
      this.searchLeads(orgId, term, scope),
      this.searchListings(orgId, term, scope),
      this.searchTransactions(orgId, term, scope),
      this.searchRentals(orgId, term, scope),
      this.searchAgents(orgId, term, scope),
      this.searchDocuments(orgId, term, scope),
      this.searchVectors(orgId, term)
    ]);

    const combined = [...leads, ...listings, ...transactions, ...rentals, ...agents, ...documents, ...vectors]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 50);

    return { query: term, results: combined };
  }

  private scopeFilter(scope: Scope): Prisma.OrgListingWhereInput['AND'] {
    const clauses: Prisma.OrgListingWhereInput[] = [];
    if (scope.officeId) {
      clauses.push({ officeId: scope.officeId });
    }
    if (scope.teamId) {
      clauses.push({ agentProfile: { teamId: scope.teamId } });
    }
    return clauses.length ? clauses : undefined;
  }

  private async searchLeads(orgId: string, term: string, scope: Scope): Promise<GlobalSearchResultDto[]> {
    const where: Prisma.LeadWhereInput = {
      organizationId: orgId,
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { message: { contains: term, mode: 'insensitive' } }
      ]
    };
    if (scope.officeId) {
      where.officeId = scope.officeId;
    }
    if (scope.teamId) {
      where.agentProfile = { teamId: scope.teamId };
    }

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        bedrooms: true,
        bathrooms: true
      }
    });
    return rows.map((lead) => ({
      type: 'lead',
      id: lead.id,
      title: lead.name || lead.email || 'Lead',
      subtitle: `Status: ${lead.status}`,
      route: `/dashboard/leads?focus=${lead.id}`,
      score: 0.6
    }));
  }

  private async searchListings(orgId: string, term: string, scope: Scope) {
    const where: Prisma.OrgListingWhereInput = {
      organizationId: orgId,
      OR: [
        { addressLine1: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { postalCode: { contains: term, mode: 'insensitive' } },
        { mlsNumber: { contains: term, mode: 'insensitive' } }
      ],
      AND: this.scopeFilter(scope)
    };
    const rows = await this.prisma.orgListing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        addressLine1: true,
        city: true,
        state: true,
        status: true,
        listPrice: true
      }
    });
    return rows.map((listing) => ({
      type: 'listing',
      id: listing.id,
      title: listing.addressLine1,
      subtitle: `${listing.city}, ${listing.state} · ${listing.status}`,
      route: `/dashboard/properties/${listing.id}`,
      score: 0.7
    }));
  }

  private async searchTransactions(orgId: string, term: string, scope: Scope) {
    const where: Prisma.OrgTransactionWhereInput = {
      organizationId: orgId,
      OR: [
        { buyerName: { contains: term, mode: 'insensitive' } },
        { sellerName: { contains: term, mode: 'insensitive' } },
        { complianceNotes: { contains: term, mode: 'insensitive' } }
      ]
    };
    if (scope.officeId) {
      where.officeId = scope.officeId;
    }
    if (scope.teamId) {
      where.agentProfile = { teamId: scope.teamId };
    }
    const rows = await this.prisma.orgTransaction.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        buyerName: true,
        sellerName: true,
        status: true,
        closingDate: true
      }
    });
    return rows.map((txn) => ({
      type: 'transaction',
      id: txn.id,
      title: txn.buyerName ? `${txn.buyerName} ↔ ${txn.sellerName ?? 'Seller'}` : 'Transaction',
      subtitle: `Status: ${txn.status}${txn.closingDate ? ` · Closing ${txn.closingDate.toISOString().slice(0, 10)}` : ''}`,
      route: `/dashboard/transactions/${txn.id}`,
      score: 0.65
    }));
  }

  private async searchRentals(orgId: string, term: string, scope: Scope) {
    const where: Prisma.RentalLeaseWhereInput = {
      organizationId: orgId,
      OR: [
        { tenantName: { contains: term, mode: 'insensitive' } },
        { complianceNotes: { contains: term, mode: 'insensitive' } }
      ]
    };
    if (scope.officeId) {
      where.officeId = scope.officeId;
    }
    const rows = await this.prisma.rentalLease.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        tenantName: true,
        tenancyType: true,
        startDate: true,
        endDate: true
      }
    });
    return rows.map((lease) => ({
      type: 'rental',
      id: lease.id,
      title: lease.tenantName ?? 'Rental Lease',
      subtitle: `${lease.tenancyType} · ${lease.startDate.toISOString().slice(0, 10)} → ${lease.endDate.toISOString().slice(0, 10)}`,
      route: `/dashboard/rentals/${lease.id}`,
      score: 0.6
    }));
  }

  private async searchAgents(orgId: string, term: string, scope: Scope) {
    const where: Prisma.AgentProfileWhereInput = {
      organizationId: orgId,
      OR: [
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { licenseNumber: { contains: term, mode: 'insensitive' } }
      ]
    };
    if (scope.officeId) {
      where.officeId = scope.officeId;
    }
    if (scope.teamId) {
      where.teamId = scope.teamId;
    }
    const rows = await this.prisma.agentProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        teamId: true,
        officeId: true,
        user: { select: { firstName: true, lastName: true, email: true } }
      }
    });
    return rows.map((agent) => ({
      type: 'agent',
      id: agent.id,
      title: `${agent.user.firstName} ${agent.user.lastName}`.trim(),
      subtitle: agent.title ?? agent.user.email ?? undefined,
      route: `/dashboard/team/${agent.id}`,
      score: 0.55
    }));
  }

  private async searchDocuments(orgId: string, term: string, scope: Scope) {
    const where: Prisma.OrgFileWhereInput = {
      orgId,
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ]
    };
    if (scope.officeId || scope.teamId) {
      where.OR = [
        { listing: { officeId: scope.officeId ?? undefined, agentProfile: scope.teamId ? { teamId: scope.teamId } : undefined } },
        { transaction: { officeId: scope.officeId ?? undefined, agentProfile: scope.teamId ? { teamId: scope.teamId } : undefined } },
        { lease: { officeId: scope.officeId ?? undefined } }
      ];
    }
    let rows: Array<{ id: string; name: string; documentType?: string | null; complianceStatus?: string | null }> = [];
    try {
      rows = await this.prisma.orgFile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          documentType: true,
          complianceStatus: true
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2021' || error.code === 'P2022')
      ) {
        // Older DBs may not have documentType/complianceStatus; fall back to name-only results.
        rows = await this.prisma.orgFile.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, name: true }
        });
      } else {
        throw error;
      }
    }
    return rows.map((file) => ({
      type: 'document',
      id: file.id,
      title: file.name,
      subtitle: file.documentType ? `${file.documentType}${file.complianceStatus ? ` · ${file.complianceStatus}` : ''}` : undefined,
      route: `/dashboard/compliance?view=documents&fileId=${file.id}`,
      score: 0.5
    }));
  }

  private async searchVectors(orgId: string, term: string) {
    try {
      const [queryVector] = await this.embeddings.embed([term], { tenantId: orgId });
      const rows = await this.prisma.searchVector.findMany({
        where: { organizationId: orgId },
        take: 20,
        orderBy: { updatedAt: 'desc' }
      });
      const queryNorm = this.norm(queryVector);
      if (!queryNorm) {
        return [];
      }
      const scored = rows
        .map((row) => {
          const embedding = row.embedding as number[] | null;
          if (!embedding || embedding.length !== queryVector.length) {
            return null;
          }
          const dot = queryVector.reduce((sum, value, idx) => sum + value * embedding[idx], 0);
          const denom = queryNorm * this.norm(embedding);
          const cosine = denom ? dot / denom : 0;
          return {
            type: row.entityType,
            id: row.entityId,
            title: row.content?.slice(0, 120) ?? row.entityType,
            subtitle: 'AI search match',
            route: this.vectorRoute(row.entityType, row.entityId),
            score: cosine,
            metadata: { content: row.content }
          } as GlobalSearchResultDto;
        })
        .filter((item): item is GlobalSearchResultDto => Boolean(item))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);
      return scored;
    } catch (error) {
      return [];
    }
  }

  private norm(values: number[]) {
    return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  }

  private vectorRoute(type: string, entityId: string) {
    switch (type) {
      case 'document':
        return `/dashboard/compliance?view=documents&fileId=${entityId}`;
      case 'knowledge_doc':
        return `/dashboard/forms`;
      case 'listing':
        return `/dashboard/properties/${entityId}`;
      case 'transaction':
        return `/dashboard/transactions/${entityId}`;
      case 'lead':
        return `/dashboard/leads?focus=${entityId}`;
      case 'knowledge-document':
        return `/dashboard/mission-control`;
      default:
        return undefined;
    }
  }
}
