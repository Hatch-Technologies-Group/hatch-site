import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { TokensService } from './tokens.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RegisterConsumerDto } from './dto/register-consumer.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@hatch/db';
import * as bcrypt from 'bcryptjs';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface OidcRequest extends FastifyRequest {
  user?: {
    userId?: string;
    email?: string;
    name?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly tokens: TokensService, private readonly prisma: PrismaService) {}

  @Get('login')
  @UseGuards(AuthGuard('oidc'))
  // Intentionally empty: guard handles redirect.
  login() {
    return;
  }

  @Get('callback')
  @UseGuards(AuthGuard('oidc'))
  callback(@Req() req: OidcRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const userId = req.user?.userId;
    const email = req.user?.email;

    const accessToken = this.tokens.issueAccess({
      sub: userId,
      email
    });
    const refreshToken = this.tokens.issueRefresh({ sub: userId });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'development',
      maxAge: THIRTY_DAYS_MS,
      path: '/'
    });

    return {
      accessToken
    };
  }

  @Post('register-consumer')
  async registerConsumer(@Body() dto: RegisterConsumerDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException('Email already in use');
    }

    const orgId = process.env.DEFAULT_ORG_ID ?? 'org-hatch';
    const tenantId = process.env.DEFAULT_TENANT_ID ?? 'tenant-hatch';

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId: orgId,
        tenantId: tenantId,
        role: UserRole.CONSUMER,
        passwordHash
      }
    });

    const accessToken = this.tokens.issueAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: [user.role.toLowerCase()],
      tenantId: user.tenantId,
      orgId: user.organizationId
    });
    const refreshToken = this.tokens.issueRefresh({ sub: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }

  @Post('login')
  async loginPassword(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.tokens.issueAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: [user.role.toLowerCase()],
      tenantId: user.tenantId,
      orgId: user.organizationId
    });
    const refreshToken = this.tokens.issueRefresh({ sub: user.id });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}
