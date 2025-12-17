import { Injectable, Logger } from '@nestjs/common';
import { ContractFieldSourceType, UserRole, type ContractFieldMapping } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';

export interface ContractContextParties {
  buyer?: any;
  seller?: any;
  listingAgent?: any;
  buyerAgent?: any;
  brokerage?: any;
  broker?: any;
}

export interface ContractContext {
  org: any;
  property?: any;
  transaction?: any;
  parties: ContractContextParties;
  system: {
    generatedDate: string;
    effectiveDate?: string;
  };
}

@Injectable()
export class ContractsAutofillService {
  private readonly logger = new Logger(ContractsAutofillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  async buildContext(params: {
    orgId: string;
    listingId?: string | null;
    transactionId?: string | null;
    buyerPersonId?: string | null;
    sellerPersonId?: string | null;
  }): Promise<ContractContext> {
    const { orgId, listingId, transactionId, buyerPersonId, sellerPersonId } = params;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    const property = listingId
      ? await this.prisma.orgListing.findUnique({
          where: { id: listingId },
          include: {
            agentProfile: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
            brokerApprovedByUser: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        })
      : null;

    const transaction = transactionId
      ? await this.prisma.orgTransaction.findUnique({
          where: { id: transactionId },
          include: {
            listing: true,
            buyerPerson: true,
            sellerPerson: true
          }
        })
      : null;

    const buyer =
      buyerPersonId
        ? await this.prisma.person.findFirst({ where: { id: buyerPersonId, organizationId: orgId } })
        : (transaction as any)?.buyerPerson ?? null;

    const seller =
      sellerPersonId
        ? await this.prisma.person.findFirst({ where: { id: sellerPersonId, organizationId: orgId } })
        : (transaction as any)?.sellerPerson ?? null;

    const broker =
      (property as any)?.brokerApprovedByUser ??
      (await this.prisma.user.findFirst({
        where: { organizationId: orgId, role: UserRole.BROKER },
        select: { id: true, firstName: true, lastName: true, email: true }
      }));

    const now = new Date().toISOString().slice(0, 10);
    const listingAgent = (property as any)?.agentProfile ? this.toAgentParty((property as any).agentProfile) : null;

    const propertyWithComputed = property
      ? {
          ...property,
          fullAddress: this.formatListingAddress(property)
        }
      : null;

    return {
      org,
      property: propertyWithComputed,
      transaction,
      parties: {
        buyer: this.toContactParty(buyer),
        seller: this.toContactParty(seller),
        listingAgent,
        buyerAgent: null,
        brokerage: org,
        broker: this.toUserParty(broker)
      },
      system: {
        generatedDate: now,
        effectiveDate: now
      }
    };
  }

  async autofillTemplateToDraft(params: {
    orgId: string;
    templateId: string;
    listingId?: string | null;
    transactionId?: string | null;
    buyerPersonId?: string | null;
    sellerPersonId?: string | null;
    overrideFieldValues?: Record<string, unknown>;
  }): Promise<{ fieldValues: Record<string, unknown>; draftS3Key: string; missingRequired: string[] }> {
    const { orgId, templateId, listingId, transactionId, buyerPersonId, sellerPersonId, overrideFieldValues } = params;
    const template = await this.prisma.contractTemplate.findUniqueOrThrow({
      where: { id: templateId }
    });

    const context = await this.buildContext({
      orgId,
      listingId,
      transactionId,
      buyerPersonId,
      sellerPersonId
    });

    const mappings = await this.prisma.contractFieldMapping.findMany({
      where: { templateId },
      orderBy: { templateFieldKey: 'asc' }
    });

    const { fieldValues, missingRequired } = this.applyMappings(mappings, overrideFieldValues, context);

    // Use the template PDF already in S3 instead of generating a JSON “draft”.
    // DocuSign requires a real document bytes payload, so we keep fieldValues in DB
    // but point draftS3Key to the template PDF.
    const draftS3Key = template.s3Key;

    return { fieldValues, draftS3Key, missingRequired };
  }

  applyMappings(
    mappings: ContractFieldMapping[],
    overrides: Record<string, unknown> | undefined,
    context: ContractContext
  ): { fieldValues: Record<string, unknown>; missingRequired: string[] } {
    const fieldValues: Record<string, unknown> = {};
    const missingRequired: string[] = [];
    const overrideValues = overrides ?? {};

    for (const mapping of mappings) {
      const hasOverride = Object.prototype.hasOwnProperty.call(overrideValues, mapping.templateFieldKey);
      if (hasOverride) {
        const override = overrideValues[mapping.templateFieldKey];
        if (override !== undefined) {
          fieldValues[mapping.templateFieldKey] = override;
        }
        continue;
      }

      const resolved = this.resolveValueFromContext(mapping, context);
      if (resolved !== undefined && resolved !== null) {
        fieldValues[mapping.templateFieldKey] = resolved;
        continue;
      }

      if (mapping.defaultValue !== null && mapping.defaultValue !== undefined) {
        fieldValues[mapping.templateFieldKey] = mapping.defaultValue;
        continue;
      }

      if (mapping.required) {
        missingRequired.push(mapping.templateFieldKey);
      }
    }

    // Apply system defaults for dates to keep drafts usable even when data is sparse.
    const today = context.system.generatedDate ?? new Date().toISOString().slice(0, 10);
    fieldValues['EFFECTIVE_DATE'] ??= context.system.effectiveDate ?? today;
    fieldValues['OFFER_DATE'] ??= today;
    fieldValues['GENERATED_DATE'] ??= today;

    const property = context.property as any;
    if (property) {
      fieldValues['PROPERTY_ADDRESS'] ??= property.fullAddress ?? null;
      fieldValues['PROPERTY_CITY'] ??= property.city ?? null;
      fieldValues['PROPERTY_STATE'] ??= property.state ?? null;
      fieldValues['PROPERTY_POSTAL_CODE'] ??= property.postalCode ?? null;
    }

    const listingAgent = (context.parties as any)?.listingAgent;
    if (listingAgent) {
      fieldValues['LISTING_AGENT_NAME'] ??= listingAgent.fullName ?? null;
      fieldValues['LISTING_AGENT_EMAIL'] ??= listingAgent.email ?? null;
    }

    const broker = (context.parties as any)?.broker;
    if (broker) {
      fieldValues['BROKER_NAME'] ??= broker.fullName ?? null;
      fieldValues['BROKER_EMAIL'] ??= broker.email ?? null;
    }

    const buyer = (context.parties as any)?.buyer;
    if (buyer) {
      fieldValues['BUYER_NAME'] ??= buyer.fullName ?? null;
      fieldValues['BUYER_EMAIL'] ??= buyer.email ?? null;
      fieldValues['BUYER_PHONE'] ??= buyer.phone ?? null;
    }

    const seller = (context.parties as any)?.seller;
    if (seller) {
      fieldValues['SELLER_NAME'] ??= seller.fullName ?? null;
      fieldValues['SELLER_EMAIL'] ??= seller.email ?? null;
      fieldValues['SELLER_PHONE'] ??= seller.phone ?? null;
    }

    // Preserve any override keys that do not have an explicit mapping row.
    for (const [key, value] of Object.entries(overrideValues)) {
      if (!(key in fieldValues)) {
        fieldValues[key] = value;
      }
    }

    return { fieldValues, missingRequired };
  }

  private resolveValueFromContext(mapping: ContractFieldMapping, context: ContractContext): unknown {
    switch (mapping.sourceType) {
      case ContractFieldSourceType.PROPERTY:
        return this.deepGet(context.property, mapping.sourcePath);
      case ContractFieldSourceType.PARTY:
        return this.resolvePartyPath(context.parties, mapping.sourcePath);
      case ContractFieldSourceType.BROKERAGE:
      case ContractFieldSourceType.ORG:
        return this.deepGet(context.org, mapping.sourcePath);
      case ContractFieldSourceType.STATIC:
        return mapping.defaultValue ?? null;
      default:
        return null;
    }
  }

  private resolvePartyPath(parties: ContractContextParties, path: string | null | undefined): any {
    if (!path) return null;
    const [role, ...rest] = path.split('.');
    const base = (parties as any)[role];
    if (!base) return null;
    return this.deepGet(base, rest.join('.'));
  }

  private deepGet(obj: any, path: string | null | undefined): any {
    if (!obj || !path) return null;
    return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
  }

  private formatListingAddress(listing: any): string | null {
    if (!listing) return null;
    const line1 = listing.addressLine1 ?? '';
    const line2 = listing.addressLine2 ?? '';
    const city = listing.city ?? '';
    const state = listing.state ?? '';
    const postal = listing.postalCode ?? '';
    const country = listing.country ?? '';

    const street = [line1, line2].filter(Boolean).join(' ').trim();
    const cityState = [city, state].filter(Boolean).join(', ').trim();
    const locality = [cityState, postal].filter(Boolean).join(' ').trim();
    return [street, locality, country].filter(Boolean).join(', ').trim() || null;
  }

  private toContactParty(person: any): any {
    if (!person) return null;
    const firstName = person.firstName ?? '';
    const lastName = person.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ...person,
      fullName,
      email: person.primaryEmail ?? null,
      phone: person.primaryPhone ?? null
    };
  }

  private toUserParty(user: any): any {
    if (!user) return null;
    const firstName = user.firstName ?? '';
    const lastName = user.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ...user,
      fullName,
      email: user.email ?? null
    };
  }

  private toAgentParty(agentProfile: any): any {
    if (!agentProfile) return null;
    const user = agentProfile.user;
    const firstName = user?.firstName ?? '';
    const lastName = user?.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ...agentProfile,
      fullName,
      email: user?.email ?? null
    };
  }
}
