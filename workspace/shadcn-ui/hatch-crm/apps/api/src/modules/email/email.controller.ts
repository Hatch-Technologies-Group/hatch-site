import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { resolveRequestContext } from '@/modules/common';

import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emails: EmailService) {}

  @Post('send')
  async sendPreview(@Body() dto: SendEmailDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.emails.sendPreview({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      to: dto.to,
      segmentKey: dto.segmentKey,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      personaId: dto.personaId
    });
  }
}
