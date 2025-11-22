import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { ChatService } from './chat.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { SendMessageDto } from './dto/send-message.dto'

interface AuthedRequest {
  user?: { userId?: string }
}

@ApiTags('chat')
@ApiBearerAuth()
@Controller('organizations/:orgId/chat')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  async listSessions(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.chat.listSessions(orgId, userId)
  }

  @Post('sessions')
  async createSession(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() body: CreateSessionDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.chat.createSession(orgId, userId, body.title)
  }

  @Get('sessions/:sessionId')
  async getSession(
    @Param('orgId') orgId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.chat.getMessages(sessionId, orgId, userId)
  }

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('orgId') orgId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthedRequest,
    @Body() body: SendMessageDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return { messages: await this.chat.sendMessage(orgId, userId, sessionId, body.content) }
  }
}
