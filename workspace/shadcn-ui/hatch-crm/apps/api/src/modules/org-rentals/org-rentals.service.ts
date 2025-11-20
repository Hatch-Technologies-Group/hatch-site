import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  OrgEventType,
  Prisma,
  RentalPropertyType,
  RentalStatus,
  RentalTaxStatus,
  RentalTenancyType,
  RentalUnitStatus,
  UserRole
} from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { OrgEventsService } from '../org-events/org-events.service';
import { CreateRentalPropertyDto } from './dto/create-rental-property.dto';
import { UpdateRentalPropertyDto } from './dto/update-rental-property.dto';
import { CreateRentalUnitDto } from './dto/create-rental-unit.dto';
import { UpdateRentalUnitDto } from './dto/update-rental-unit.dto';
import { CreateRentalLeaseDto } from './dto/create-rental-lease.dto';
import { UpdateRentalLeaseDto } from './dto/update-rental-lease.dto';
import { UpdateRentalTaxScheduleDto } from './dto/update-tax-schedule.dto';

@Injectable()
export class OrgRentalsService {
  constructor(private readonly prisma: PrismaService, private readonly orgEvents: OrgEventsService) {}

  private async assertUserInOrg(userId: string, orgId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!membership) {
      throw new ForbiddenException('User is not part of this organization');
    }
    return membership;
  }

  private async getUserRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role ?? null;
  }

  private async assertBroker(userId: string, orgId: string) {
    await this.assertUserInOrg(userId, orgId);
    const role = await this.getUserRole(userId);
    if (role !== UserRole.BROKER) {
      throw new ForbiddenException('Broker access required');
    }
  }

  private async assertBrokerOrAgent(userId: string, orgId: string) {
    await this.assertUserInOrg(userId, orgId);
    const role = await this.getUserRole(userId);
    if (role !== UserRole.BROKER && role !== UserRole.AGENT && role !== UserRole.TEAM_LEAD) {
      throw new ForbiddenException('Broker or agent access required');
    }
  }

  private async assertListingInOrg(listingId: string, orgId: string) {
    const listing = await this.prisma.orgListing.findUnique({
      where: { id: listingId },
      select: { id: true, organizationId: true }
    });
    if (!listing || listing.organizationId !== orgId) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  private async assertPropertyInOrg(propertyId: string, orgId: string) {
    const property = await this.prisma.rentalProperty.findUnique({
      where: { id: propertyId },
      include: { organization: true }
    });
    if (!property || property.organizationId !== orgId) {
      throw new NotFoundException('Rental property not found');
    }
    return property;
  }

  private async assertUnitInOrg(unitId: string, orgId: string) {
    const unit = await this.prisma.rentalUnit.findUnique({
      where: { id: unitId },
      include: { property: true }
    });
    if (!unit || unit.property.organizationId !== orgId) {
      throw new NotFoundException('Rental unit not found');
    }
    return unit;
  }

  private async assertLeaseInOrg(leaseId: string, orgId: string) {
    const lease = await this.prisma.rentalLease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } }, taxSchedule: true }
    });
    if (!lease || lease.organizationId !== orgId) {
      throw new NotFoundException('Rental lease not found');
    }
    return lease;
  }

  async createRentalProperty(orgId: string, brokerUserId: string, dto: CreateRentalPropertyDto) {
    await this.assertBroker(brokerUserId, orgId);
    if (dto.listingId) {
      await this.assertListingInOrg(dto.listingId, orgId);
    }

    const property = await this.prisma.rentalProperty.create({
      data: {
        organizationId: orgId,
        listingId: dto.listingId ?? undefined,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? undefined,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country ?? undefined,
        propertyType: dto.propertyType ? (dto.propertyType as RentalPropertyType) : undefined,
        ownerName: dto.ownerName ?? undefined,
        ownerContact: dto.ownerContact ?? undefined
      }
    });

    const shouldCreateUnit =
      dto.unitName || dto.bedrooms !== undefined || dto.bathrooms !== undefined || dto.squareFeet !== undefined;
    if (shouldCreateUnit) {
      await this.prisma.rentalUnit.create({
        data: {
          propertyId: property.id,
          name: dto.unitName ?? undefined,
          bedrooms: dto.bedrooms ?? undefined,
          bathrooms: dto.bathrooms ?? undefined,
          squareFeet: dto.squareFeet ?? undefined
        }
      });
    }

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId: brokerUserId,
      type: OrgEventType.ORG_RENTAL_PROPERTY_CREATED,
      payload: { rentalPropertyId: property.id }
    });

    return this.prisma.rentalProperty.findUniqueOrThrow({
      where: { id: property.id },
      include: { units: true }
    });
  }

  async updateRentalProperty(orgId: string, brokerUserId: string, propertyId: string, dto: UpdateRentalPropertyDto) {
    await this.assertBroker(brokerUserId, orgId);
    await this.assertPropertyInOrg(propertyId, orgId);
    return this.prisma.rentalProperty.update({
      where: { id: propertyId },
      data: {
        status: dto.status ? (dto.status as RentalStatus) : undefined,
        ownerName: dto.ownerName === null ? null : dto.ownerName ?? undefined,
        ownerContact: dto.ownerContact === null ? null : dto.ownerContact ?? undefined
      }
    });
  }

  async listRentalProperties(orgId: string, userId: string) {
    await this.assertUserInOrg(userId, orgId);
    return this.prisma.rentalProperty.findMany({
      where: { organizationId: orgId },
      include: {
        units: {
          include: {
            leases: {
              orderBy: { startDate: 'desc' },
              take: 3
            }
          }
        },
        listing: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createRentalUnit(orgId: string, brokerUserId: string, dto: CreateRentalUnitDto) {
    await this.assertBroker(brokerUserId, orgId);
    await this.assertPropertyInOrg(dto.propertyId, orgId);
    return this.prisma.rentalUnit.create({
      data: {
        propertyId: dto.propertyId,
        name: dto.name ?? undefined,
        bedrooms: dto.bedrooms ?? undefined,
        bathrooms: dto.bathrooms ?? undefined,
        squareFeet: dto.squareFeet ?? undefined
      }
    });
  }

  async updateRentalUnit(orgId: string, brokerUserId: string, unitId: string, dto: UpdateRentalUnitDto) {
    await this.assertBroker(brokerUserId, orgId);
    await this.assertUnitInOrg(unitId, orgId);
    return this.prisma.rentalUnit.update({
      where: { id: unitId },
      data: {
        status: dto.status ? (dto.status as RentalUnitStatus) : undefined,
        name: dto.name === null ? null : dto.name ?? undefined,
        bedrooms: dto.bedrooms === null ? null : dto.bedrooms ?? undefined,
        bathrooms: dto.bathrooms === null ? null : dto.bathrooms ?? undefined,
        squareFeet: dto.squareFeet === null ? null : dto.squareFeet ?? undefined
      }
    });
  }

  private buildLeaseWhere(
    orgId: string,
    filters?: { propertyId?: string; tenancyType?: string; taxStatus?: string; dueWithinDays?: number }
  ) {
    const where: Prisma.RentalLeaseWhereInput = {
      organizationId: orgId
    };
    if (filters?.propertyId) {
      where.unit = { propertyId: filters.propertyId };
    }
    if (filters?.tenancyType) {
      where.tenancyType = filters.tenancyType as RentalTenancyType;
    }
    const taxFilters: Prisma.RentalTaxScheduleWhereInput = {};
    if (filters?.taxStatus) {
      taxFilters.status = filters.taxStatus as RentalTaxStatus;
    }
    if (filters?.dueWithinDays && filters.dueWithinDays > 0) {
      const now = new Date();
      const future = new Date(now.getTime() + filters.dueWithinDays * 24 * 60 * 60 * 1000);
      taxFilters.status = RentalTaxStatus.PENDING;
      taxFilters.dueDate = { gte: now, lte: future };
    }
    if (Object.keys(taxFilters).length > 0) {
      where.taxSchedule = { some: taxFilters };
    }

    return where;
  }

  async listRentalLeases(
    orgId: string,
    userId: string,
    filters?: { propertyId?: string; tenancyType?: string; taxStatus?: string; dueWithinDays?: number }
  ) {
    await this.assertUserInOrg(userId, orgId);
    const where = this.buildLeaseWhere(orgId, filters);
    return this.prisma.rentalLease.findMany({
      where,
      include: {
        unit: {
          include: {
            property: true
          }
        },
        taxSchedule: {
          orderBy: { dueDate: 'asc' }
        }
      },
      orderBy: { startDate: 'desc' }
    });
  }

  async createRentalLease(orgId: string, actorUserId: string, dto: CreateRentalLeaseDto) {
    await this.assertBrokerOrAgent(actorUserId, orgId);
    const unit = await this.assertUnitInOrg(dto.unitId, orgId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const lease = await this.prisma.rentalLease.create({
      data: {
        organizationId: orgId,
        unitId: unit.id,
        tenancyType: (dto.tenancyType as RentalTenancyType | undefined) ?? undefined,
        tenantName: dto.tenantName,
        tenantContact: dto.tenantContact ?? undefined,
        startDate,
        endDate,
        rentAmount: dto.rentAmount ?? undefined,
        requiresTaxFiling: dto.requiresTaxFiling ?? false
      }
    });

    if (lease.requiresTaxFiling) {
      await this.ensureTaxSchedulesForLease(lease.id, lease.tenancyType, startDate, endDate, lease.rentAmount);
    }

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId: actorUserId,
      type: OrgEventType.ORG_RENTAL_LEASE_CREATED,
      payload: { rentalLeaseId: lease.id, unitId: unit.id }
    });

    return this.prisma.rentalLease.findUniqueOrThrow({
      where: { id: lease.id },
      include: {
        unit: { include: { property: true } },
        taxSchedule: true
      }
    });
  }

  private async ensureTaxSchedulesForLease(
    leaseId: string,
    tenancyType: RentalTenancyType,
    startDate: Date,
    endDate: Date,
    rentAmount?: number | null
  ) {
    const existing = await this.prisma.rentalTaxSchedule.count({ where: { leaseId } });
    if (existing > 0) return;
    const label =
      tenancyType === RentalTenancyType.SEASONAL
        ? `${startDate.getFullYear()}-${endDate.getFullYear()} Season`
        : `${startDate.getFullYear()} Lease`;
    await this.prisma.rentalTaxSchedule.create({
      data: {
        leaseId,
        periodLabel: label,
        dueDate: endDate,
        amountDue: rentAmount ?? undefined
      }
    });
  }

  async updateRentalLease(orgId: string, userId: string, leaseId: string, dto: UpdateRentalLeaseDto) {
    await this.assertBrokerOrAgent(userId, orgId);
    const lease = await this.assertLeaseInOrg(leaseId, orgId);
    const data: Record<string, unknown> = {
      tenancyType: dto.tenancyType ?? undefined,
      tenantName: dto.tenantName ?? undefined,
      tenantContact: dto.tenantContact === null ? null : dto.tenantContact ?? undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      rentAmount: dto.rentAmount === null ? null : dto.rentAmount ?? undefined,
      requiresTaxFiling: dto.requiresTaxFiling ?? undefined,
      isCompliant: dto.isCompliant ?? undefined,
      complianceNotes: dto.complianceNotes === null ? null : dto.complianceNotes ?? undefined
    };
    const updated = await this.prisma.rentalLease.update({
      where: { id: leaseId },
      data
    });

    if (dto.requiresTaxFiling && !lease.requiresTaxFiling) {
      await this.ensureTaxSchedulesForLease(
        leaseId,
        (dto.tenancyType as RentalTenancyType | undefined) ?? lease.tenancyType,
        dto.startDate ? new Date(dto.startDate) : lease.startDate,
        dto.endDate ? new Date(dto.endDate) : lease.endDate,
        dto.rentAmount ?? lease.rentAmount
      );
    }

    return this.prisma.rentalLease.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        unit: { include: { property: true } },
        taxSchedule: true
      }
    });
  }

  async updateTaxSchedule(orgId: string, userId: string, taxScheduleId: string, dto: UpdateRentalTaxScheduleDto) {
    await this.assertBrokerOrAgent(userId, orgId);
    const schedule = await this.prisma.rentalTaxSchedule.findUnique({
      where: { id: taxScheduleId },
      include: { lease: true }
    });
    if (!schedule || schedule.lease.organizationId !== orgId) {
      throw new NotFoundException('Tax schedule not found');
    }
    const paidDate =
      dto.paidDate === null ? null : dto.paidDate ? new Date(dto.paidDate) : dto.status === 'PAID' ? new Date() : undefined;
    const updated = await this.prisma.rentalTaxSchedule.update({
      where: { id: taxScheduleId },
      data: {
        status: dto.status ?? undefined,
        paidDate,
        notes: dto.notes === null ? null : dto.notes ?? undefined
      }
    });

    await this.refreshLeaseCompliance(schedule.leaseId);

    return updated;
  }

  private async refreshLeaseCompliance(leaseId: string) {
    const schedules = await this.prisma.rentalTaxSchedule.findMany({ where: { leaseId } });
    if (schedules.length === 0) return;
    const isCompliant = schedules.every((entry) => entry.status === RentalTaxStatus.PAID);
    await this.prisma.rentalLease.update({
      where: { id: leaseId },
      data: { isCompliant }
    });
  }
}
