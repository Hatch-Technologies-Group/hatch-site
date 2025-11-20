import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { OrgRentalsService } from './org-rentals.service';
import { CreateRentalPropertyDto } from './dto/create-rental-property.dto';
import { UpdateRentalPropertyDto } from './dto/update-rental-property.dto';
import { CreateRentalUnitDto } from './dto/create-rental-unit.dto';
import { UpdateRentalUnitDto } from './dto/update-rental-unit.dto';
import { CreateRentalLeaseDto } from './dto/create-rental-lease.dto';
import { UpdateRentalLeaseDto } from './dto/update-rental-lease.dto';
import { UpdateRentalTaxScheduleDto } from './dto/update-tax-schedule.dto';

interface AuthedRequest {
  user?: { userId?: string; sub?: string };
}

const getUserId = (req: AuthedRequest) => req.user?.userId ?? req.user?.sub ?? null;

@ApiTags('rentals')
@ApiBearerAuth()
@Controller()
export class OrgRentalsController {
  constructor(private readonly rentals: OrgRentalsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:orgId/rentals/properties')
  createRentalProperty(@Param('orgId') orgId: string, @Body() dto: CreateRentalPropertyDto, @Req() req: AuthedRequest) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.createRentalProperty(orgId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:orgId/rentals/properties/:propertyId')
  updateRentalProperty(
    @Param('orgId') orgId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdateRentalPropertyDto,
    @Req() req: AuthedRequest
  ) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.updateRentalProperty(orgId, userId, propertyId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/rentals/properties')
  listRentalProperties(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.listRentalProperties(orgId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:orgId/rentals/units')
  createRentalUnit(@Param('orgId') orgId: string, @Body() dto: CreateRentalUnitDto, @Req() req: AuthedRequest) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.createRentalUnit(orgId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:orgId/rentals/units/:unitId')
  updateRentalUnit(
    @Param('orgId') orgId: string,
    @Param('unitId') unitId: string,
    @Body() dto: UpdateRentalUnitDto,
    @Req() req: AuthedRequest
  ) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.updateRentalUnit(orgId, userId, unitId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:orgId/rentals/leases')
  createRentalLease(@Param('orgId') orgId: string, @Body() dto: CreateRentalLeaseDto, @Req() req: AuthedRequest) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.createRentalLease(orgId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:orgId/rentals/leases/:leaseId')
  updateRentalLease(
    @Param('orgId') orgId: string,
    @Param('leaseId') leaseId: string,
    @Body() dto: UpdateRentalLeaseDto,
    @Req() req: AuthedRequest
  ) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.updateRentalLease(orgId, userId, leaseId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/rentals/leases')
  listRentalLeases(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('tenancyType') tenancyType?: string,
    @Query('taxStatus') taxStatus?: string,
    @Query('dueWithinDays') dueWithinDays?: string
  ) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    const filters = {
      propertyId: propertyId ?? undefined,
      tenancyType: tenancyType ?? undefined,
      taxStatus: taxStatus ?? undefined,
      dueWithinDays: dueWithinDays ? Number(dueWithinDays) : undefined
    };
    return this.rentals.listRentalLeases(orgId, userId, filters);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:orgId/rentals/taxes/:taxScheduleId')
  updateTaxSchedule(
    @Param('orgId') orgId: string,
    @Param('taxScheduleId') taxScheduleId: string,
    @Body() dto: UpdateRentalTaxScheduleDto,
    @Req() req: AuthedRequest
  ) {
    const userId = getUserId(req);
    if (!userId) throw new Error('Missing user context');
    return this.rentals.updateTaxSchedule(orgId, userId, taxScheduleId, dto);
  }
}
