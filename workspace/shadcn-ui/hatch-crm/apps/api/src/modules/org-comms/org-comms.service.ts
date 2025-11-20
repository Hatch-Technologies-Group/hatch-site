import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgChannelVisibility, OrgConversationType } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class OrgCommsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertUserInOrg(userId: string, orgId: string) {
    const m = await this.prisma.userOrgMembership.findUnique({ where: { userId_orgId: { userId, orgId } } });
    if (!m) throw new ForbiddenException('User is not a member of this organization');
    return m;
  }

  async createChannel(orgId: string, userId: string, dto: CreateChannelDto) {
    await this.assertUserInOrg(userId, orgId);
    const visibility = (dto.visibility as OrgChannelVisibility | undefined) ?? OrgChannelVisibility.ORG_WIDE;
    const conv = await this.prisma.orgConversation.create({
      data: {
        organizationId: orgId,
        type: OrgConversationType.CHANNEL,
        name: dto.name,
        visibility,
        createdByUserId: userId
      }
    });
    return conv;
  }

  async createDirectConversation(orgId: string, userId: string, dto: CreateDirectConversationDto) {
    await this.assertUserInOrg(userId, orgId);
    await this.assertUserInOrg(dto.otherUserId, orgId);

    // Check if a direct conversation already exists (basic heuristic)
    const existing = await this.prisma.orgConversation.findFirst({
      where: {
        organizationId: orgId,
        type: OrgConversationType.DIRECT,
        participants: { some: { userId } }
      },
      include: { participants: true }
    });
    if (existing && existing.participants.some((p) => p.userId === dto.otherUserId) && existing.participants.length === 2) {
      return existing;
    }

    const conv = await this.prisma.orgConversation.create({
      data: {
        organizationId: orgId,
        type: OrgConversationType.DIRECT,
        createdByUserId: userId,
        participants: {
          create: [{ userId }, { userId: dto.otherUserId }]
        }
      },
      include: { participants: true }
    });
    return conv;
  }

  async sendMessage(orgId: string, senderId: string, dto: SendMessageDto) {
    await this.assertUserInOrg(senderId, orgId);
    const conv = await this.prisma.orgConversation.findUnique({
      where: { id: dto.conversationId },
      include: { participants: true }
    });
    if (!conv || conv.organizationId !== orgId) throw new NotFoundException('Conversation not found');
    if (conv.type === OrgConversationType.DIRECT) {
      const isParticipant = conv.participants.some((p) => p.userId === senderId);
      if (!isParticipant) throw new ForbiddenException('Not a participant');
    }

    const attachments = (dto.attachmentFileIds ?? []).map((fileId) => ({ fileId }));
    const msg = await this.prisma.orgMessage.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        senderId,
        content: dto.content,
        metadata: (dto.metadata as any) ?? undefined,
        attachments: attachments.length ? { create: attachments } : undefined
      },
      include: { attachments: { include: { file: true } } }
    });

    await this.prisma.orgConversationParticipant.updateMany({
      where: { conversationId: conv.id, userId: senderId },
      data: { lastReadAt: new Date() }
    });

    return msg;
  }

  async listMessages(orgId: string, userId: string, conversationId: string, limit = 50, cursor?: string) {
    await this.assertUserInOrg(userId, orgId);
    const conv = await this.prisma.orgConversation.findUnique({ where: { id: conversationId }, include: { participants: true } });
    if (!conv || conv.organizationId !== orgId) throw new NotFoundException('Conversation not found');
    if (conv.type === OrgConversationType.DIRECT && !conv.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('Not a participant');
    }
    const messages = await this.prisma.orgMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        attachments: { include: { file: true } },
        sender: true
      }
    });
    return messages;
  }
}

