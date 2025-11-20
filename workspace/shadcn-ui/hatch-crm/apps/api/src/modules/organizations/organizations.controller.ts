import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateAgentInviteDto } from './dto/create-agent-invite.dto';
import { OrganizationsService } from './organizations.service';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  async create(@Req() req: AuthedRequest, @Body() dto: CreateOrganizationDto) {
    const userId = req.user?.userId;
    if (!userId) {
      // JwtAuthGuard enforces auth; this is a type guard
      throw new Error('Missing user context');
    }
    return this.orgs.createOrganizationForBroker(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async my(@Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.orgs.getOrganizationsForUser(userId);
  }

  @Post(':orgId/invites')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  async createInvite(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateAgentInviteDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    const invite = await this.orgs.createAgentInvite(orgId, userId, dto);
    return {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      organizationId: invite.organizationId,
      invitedByUserId: invite.invitedByUserId,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      // Returning token here is acceptable for broker to integrate email sending.
      token: invite.token
    };
  }

  @Get(':orgId/invites')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  async listInvites(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    const invites = await this.orgs.getOrgInvites(orgId, userId);
    return invites.map((i) => ({
      id: i.id,
      email: i.email,
      status: i.status,
      organizationId: i.organizationId,
      invitedByUserId: i.invitedByUserId,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt
    }));
  }
}
