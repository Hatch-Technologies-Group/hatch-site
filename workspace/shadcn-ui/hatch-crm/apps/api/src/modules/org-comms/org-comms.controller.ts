import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OrgCommsService } from './org-comms.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('org-comms')
@ApiBearerAuth()
@Controller('organizations/:orgId/comms')
export class OrgCommsController {
  constructor(private readonly svc: OrgCommsService) {}

  @Post('channels')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  createChannel(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateChannelDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createChannel(orgId, userId, dto);
  }

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  createDirect(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateDirectConversationDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createDirectConversation(orgId, userId, dto);
  }

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  send(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: SendMessageDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.sendMessage(orgId, userId, dto);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  list(
    @Param('orgId') orgId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit = '50',
    @Query('cursor') cursor: string | undefined,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listMessages(orgId, userId, conversationId, Number(limit ?? '50'), cursor);
  }
}

