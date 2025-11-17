import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { OutreachService } from './outreach.service';
import { OutreachProducer } from './outreach.queue';

class EnrollLeadDto {
  @IsString()
  leadId!: string;

  @IsString()
  sequenceId!: string;
}

class DraftLeadDto {
  @IsString()
  leadId!: string;
}

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(
    private readonly outreach: OutreachService,
    private readonly producer: OutreachProducer
  ) {}

  @Get('sequences')
  async listSequences(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.outreach.listSequences(tenantId);
  }

  @Post('enroll')
  async enrollLead(@Req() req: any, @Body() body: EnrollLeadDto) {
    const tenantId = req.user?.tenantId;
    return this.outreach.enrollLeadInSequence({
      tenantId,
      leadId: body.leadId,
      sequenceId: body.sequenceId
    });
  }

  @Post('draft-next')
  async draftNext(@Req() req: any, @Body() body: DraftLeadDto) {
    const tenantId = req.user?.tenantId;
    return this.outreach.draftNextStepForLead(tenantId, body.leadId);
  }

  @Post('draft-next/queue')
  async draftNextQueued(@Req() req: any, @Body() body: DraftLeadDto) {
    const tenantId = req.user?.tenantId;
    await this.producer.enqueueDraft(tenantId, body.leadId);
    return { ok: true };
  }
}
