import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AgentInvitesService } from './agent-invites.service';
import { AcceptAgentInviteDto } from './dto/accept-agent-invite.dto';

@ApiTags('agent-invites')
@Controller('agent-invites')
export class AgentInvitesController {
  constructor(private readonly svc: AgentInvitesService) {}

  @Post('accept')
  async accept(@Body() dto: AcceptAgentInviteDto) {
    return this.svc.acceptInvite(dto);
  }
}

