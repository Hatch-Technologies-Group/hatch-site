import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActivityType,
  ConversationParticipantRole,
  ConversationType,
  MessageChannel,
  MessageDirection,
  MessageReceiptStatus,
  MessageStatus,
  Prisma,
  UserRole
} from '@hatch/db';
import { OutboxService } from '../outbox/outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestContext } from '../common/request-context';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListConversationsQueryDto } from './dto/list-conversations.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { AddParticipantsDto } from './dto/update-participants.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { createHmac, randomUUID } from 'crypto';

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: {
    participants: {
      include: {
        user: { select: { id: true; firstName: true; lastName: true; email: true; role: true; avatarUrl: true } };
        person: { select: { id: true; firstName: true; lastName: true; primaryEmail: true; primaryPhone: true } };
      };
    };
    person: {
      include: {
        owner: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
            role: true;
            memberships: { select: { teamId: true } };
          };
        };
      };
    };
    messages: {
      take: 1;
      orderBy: { createdAt: 'desc' };
      include: {
        attachments: true;
        user: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } };
      };
    };
  };
}>;

type ConversationWithParticipantsOnly = Prisma.ConversationGetPayload<{
  include: {
    participants: {
      include: {
        user: { select: { id: true; firstName: true; lastName: true; email: true; role: true; avatarUrl: true } };
        person: { select: { id: true; firstName: true; lastName: true; primaryEmail: true; primaryPhone: true } };
      };
    };
    person: {
      include: {
        owner: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
            role: true;
            memberships: { select: { teamId: true } };
          };
        };
      };
    };
  };
}>;

type ConversationParticipantRecord = Prisma.ConversationParticipantGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        role: true;
        avatarUrl: true;
      };
    };
    person: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        primaryEmail: true;
        primaryPhone: true;
      };
    };
  };
}>;

type MessageWithExtras = Prisma.MessageGetPayload<{
  include: {
    attachments: true;
    receipts: true;
    user: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } };
  };
}>;

interface AttachmentTokenPayload {
  tenantId: string;
  conversationId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum?: string;
  storageKey: string;
  uploadedBy: string;
  issuedAt: number;
}

interface ListOptions extends ListConversationsQueryDto {
  tenantId: string;
}

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role?: UserRole | null;
  avatarUrl?: string | null;
}

interface PersonSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
}

interface ParticipantView {
  id: string;
  role: ConversationParticipantRole;
  user?: UserSummary | null;
  person?: PersonSummary | null;
  joinedAt: string;
  muted: boolean;
  lastReadAt?: string | null;
}

interface AttachmentView {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum?: string | null;
  scanned: boolean;
  storageKey: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

interface MessageView {
  id: string;
  conversationId: string;
  userId: string | null;
  personId: string | null;
  body: string | null;
  createdAt: string;
  status: MessageStatus;
  direction: MessageDirection;
  attachments: AttachmentView[];
  sender?: UserSummary | null;
  receipts?: Array<{ participantId: string; status: MessageReceiptStatus; recordedAt: string }>;
}

interface ConversationListItemView {
  id: string;
  tenantId: string;
  type: ConversationType;
  person?: PersonSummary | null;
  participants: ParticipantView[];
  lastMessage?: MessageView | null;
  unreadCount: number;
  updatedAt: string;
}

interface ConversationDetailView extends ConversationListItemView {
  messages: MessageView[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

@Injectable()
export class ConversationsService {
  private readonly attachmentSecret: string;
  private readonly attachmentTtlMs: number;
  private readonly maxAttachmentBytes: number;
  private readonly allowedAttachmentTypes: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService
  ) {
    this.attachmentSecret = this.config.get<string>('attachments.tokenSecret') ?? 'change-me';
    this.attachmentTtlMs = Number(this.config.get<number>('attachments.tokenTtlMs') ?? 15 * 60 * 1000);
    this.maxAttachmentBytes = Number(this.config.get<number>('attachments.maxSizeBytes') ?? 10 * 1024 * 1024);
    const configuredTypes = this.config
      .get<string>('attachments.allowedMimeTypes')
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    this.allowedAttachmentTypes = new Set(
      configuredTypes && configuredTypes.length > 0
        ? configuredTypes
        : ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain']
    );
  }

  async list(query: ListOptions, ctx: RequestContext) {
    const where = await this.buildVisibilityFilter(query.tenantId, ctx, query.type, query.search);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true }
              },
              person: {
                select: { id: true, firstName: true, lastName: true, primaryEmail: true, primaryPhone: true }
              }
            }
          },
          person: {
            include: {
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  memberships: { select: { teamId: true } }
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              attachments: true,
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true }
              }
            }
          }
        }
      }),
      this.prisma.conversation.count({ where })
    ]);

    return Promise.all(
      items.map(async (conversation) => {
        const participant = conversation.participants.find((item) => item.userId === ctx.userId) ?? null;
        const unreadCount = participant
          ? await this.countUnread(conversation.id, participant.id, participant.lastReadAt ?? null, ctx.userId)
          : 0;
        return this.mapToListItem(conversation, unreadCount);
      })
    ).then((list) => ({
      items: list,
      total,
      page,
      pageSize
    }));
  }

  async create(dto: CreateConversationDto, ctx: RequestContext) {
    return this.createConversation(dto, ctx);
  }

  async get(
    conversationId: string,
    tenantId: string,
    ctx: RequestContext,
    options: { cursor?: string | null; limit?: number }
  ) {
    return this.fetchConversation(conversationId, tenantId, ctx, options);
  }

  async postMessage(conversationId: string, dto: PostMessageDto & { tenantId: string }, ctx: RequestContext) {
    return this.sendMessage(conversationId, dto, ctx);
  }

  async markRead(conversationId: string, dto: MarkReadDto & { tenantId: string }, ctx: RequestContext) {
    return this.recordRead(conversationId, dto, ctx);
  }

  async addParticipants(conversationId: string, dto: AddParticipantsDto & { tenantId: string }, ctx: RequestContext) {
    return this.appendParticipants(conversationId, dto, ctx);
  }

  async removeParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    ctx: RequestContext
  ) {
    await this.pruneParticipant(conversationId, participantId, tenantId, ctx);
  }

  async requestAttachmentUpload(
    conversationId: string,
    dto: UploadAttachmentDto & { tenantId: string },
    ctx: RequestContext
  ) {
    return this.prepareAttachment(conversationId, dto, ctx);
  }

  // region: core flows
  private async ensureConversationAccess(
    conversationId: string,
    tenantId: string,
    ctx: RequestContext,
    options: { requireWrite?: boolean } = {}
  ): Promise<{ conversation: ConversationWithParticipantsOnly; participant: ConversationParticipantRecord | null }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatarUrl: true
              }
            },
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                primaryEmail: true,
                primaryPhone: true
              }
            }
          }
        },
        person: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                memberships: { select: { teamId: true } }
              }
            }
          }
        }
      }
    });

    if (!conversation || conversation.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const participant = conversation.participants.find((item) => item.userId === ctx.userId) ?? null;
    if (!this.canViewConversation(conversation, ctx, participant)) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    if (options.requireWrite && !this.canWriteConversation(conversation, ctx, participant)) {
      throw new ForbiddenException('You do not have permission to modify this conversation');
    }

    return { conversation, participant };
  }

  private canViewConversation(
    conversation: ConversationWithParticipantsOnly,
    ctx: RequestContext,
    participant: ConversationParticipantRecord | null
  ): boolean {
    if (ctx.role === UserRole.BROKER) {
      return true;
    }

    if (participant) {
      return true;
    }

    if (conversation.type === ConversationType.INTERNAL) {
      return false;
    }

    switch (ctx.role) {
      case UserRole.TEAM_LEAD:
        return this.personOwnedByTeams(conversation.person?.owner ?? null, ctx.teamIds);
      case UserRole.AGENT:
      case UserRole.ISA:
        return (
          this.personOwnedByAgent(conversation.person?.ownerId ?? null, ctx.userId) ||
          (ctx.allowTeamContactActions && this.personOwnedByTeams(conversation.person?.owner ?? null, ctx.teamIds))
        );
      case UserRole.MARKETING:
        return true;
      default:
        return false;
    }
  }

  private canWriteConversation(
    conversation: ConversationWithParticipantsOnly,
    ctx: RequestContext,
    participant: ConversationParticipantRecord | null
  ): boolean {
    if (ctx.role === UserRole.BROKER) {
      return true;
    }

    if (!participant || participant.role === ConversationParticipantRole.VIEWER) {
      return false;
    }

    switch (ctx.role) {
      case UserRole.TEAM_LEAD:
        return true;
      case UserRole.MARKETING:
        return true;
      case UserRole.LENDER:
        return true;
      case UserRole.AGENT:
      case UserRole.ISA:
        if (conversation.type === ConversationType.INTERNAL) {
          return true;
        }
        return (
          this.personOwnedByAgent(conversation.person?.ownerId ?? null, ctx.userId) ||
          (ctx.allowTeamContactActions && this.personOwnedByTeams(conversation.person?.owner ?? null, ctx.teamIds))
        );
      default:
        return !!participant;
    }
  }

  private personOwnedByAgent(ownerId: string | null, userId: string) {
    return !!ownerId && ownerId === userId;
  }

  private personOwnedByTeams(
    owner:
      | ({
          memberships: { teamId: string }[];
        } & { id: string })
      | null
      | undefined,
    teamIds: string[]
  ) {
    if (!owner || !owner.memberships) {
      return false;
    }
    const ownerTeams = owner.memberships.map((membership) => membership.teamId);
    return ownerTeams.some((teamId) => teamIds.includes(teamId));
  }

  private async createConversation(dto: CreateConversationDto, ctx: RequestContext) {
    const tenantId = dto.tenantId ?? ctx.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    if (dto.type === ConversationType.EXTERNAL) {
      if (!dto.personId) {
        throw new BadRequestException('personId is required for external conversations');
      }

      const person = await this.prisma.person.findUnique({
        where: { id: dto.personId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              memberships: { select: { teamId: true } }
            }
          }
        }
      });

      if (!person || person.tenantId !== tenantId) {
        throw new NotFoundException('Contact not found');
      }

      if (ctx.role === UserRole.MARKETING || ctx.role === UserRole.LENDER) {
        throw new ForbiddenException('You cannot start this conversation');
      }

      const canCreate = this.personOwnedByAgent(person.ownerId ?? null, ctx.userId) ||
        ctx.role === UserRole.BROKER ||
        ctx.role === UserRole.TEAM_LEAD ||
        (ctx.allowTeamContactActions && this.personOwnedByTeams(person.owner ?? null, ctx.teamIds));

      if (!canCreate) {
        throw new ForbiddenException('You cannot start a conversation for this contact');
      }

      const existing = await this.prisma.conversation.findFirst({
        where: {
          tenantId,
          type: ConversationType.EXTERNAL,
          personId: dto.personId
        }
      });

      let conversationId: string;

      if (existing) {
        conversationId = existing.id;
        const existingParticipant = await this.prisma.conversationParticipant.findFirst({
          where: { conversationId: existing.id, userId: ctx.userId }
        });
        if (!existingParticipant) {
          await this.prisma.conversationParticipant.create({
            data: {
              conversationId: existing.id,
              userId: ctx.userId,
              role: ConversationParticipantRole.MEMBER
            }
          });
        }
      } else {
        const ownerId = person.ownerId ?? ctx.userId;
        const ownerTeams = person.owner?.memberships?.map((membership) => membership.teamId) ?? [];
        const teamMemberIds = ownerTeams.length
          ? await this.prisma.teamMembership.findMany({
              where: { teamId: { in: ownerTeams } },
              select: { userId: true }
            }).then((rows) => rows.map((row) => row.userId))
          : [];

        const participantUserIds = new Set<string>();
        participantUserIds.add(ctx.userId);
        participantUserIds.add(ownerId);
        for (const userId of teamMemberIds) {
          participantUserIds.add(userId);
        }

        const participantCreates: Prisma.ConversationParticipantCreateWithoutConversationInput[] =
          Array.from(participantUserIds).map((userId) => ({
            role: userId === ownerId ? ConversationParticipantRole.OWNER : ConversationParticipantRole.MEMBER,
            user: { connect: { id: userId } }
          }));

        participantCreates.push({
          role: ConversationParticipantRole.MEMBER,
          person: { connect: { id: person.id } }
        });

        const conversation = await this.prisma.conversation.create({
          data: {
            id: randomUUID(),
            tenantId,
            type: ConversationType.EXTERNAL,
            personId: person.id,
            createdById: ctx.userId,
            participants: {
              create: participantCreates
            }
          }
        });

        conversationId = conversation.id;

        await this.outbox.enqueue({
          tenantId,
          eventType: 'conversation.created',
          actorId: ctx.userId,
          resource: { id: conversation.id, type: 'conversation' },
          occurredAt: new Date().toISOString(),
          data: {
            conversationId: conversation.id,
            type: conversation.type,
            personId: person.id
          }
        });
      }

      return this.fetchConversation(conversationId, tenantId, ctx, { limit: 25 });
    }

    // INTERNAL conversation flow
    const participantUserIds = new Set<string>([ctx.userId, ...(dto.participantUserIds ?? [])]);
    if (participantUserIds.size < 2) {
      throw new BadRequestException('Internal conversations require at least two members');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(participantUserIds) }, tenantId },
      select: { id: true }
    });
    if (users.length !== participantUserIds.size) {
      throw new BadRequestException('One or more participants are invalid');
    }

    if (ctx.role === UserRole.AGENT || ctx.role === UserRole.ISA) {
      if (!ctx.allowTeamContactActions) {
        for (const id of participantUserIds) {
          if (id !== ctx.userId) {
            throw new ForbiddenException('You can only start internal chats with your team');
          }
        }
      } else if (ctx.teamIds.length > 0) {
        const allowedIds = await this.prisma.teamMembership.findMany({
          where: { teamId: { in: ctx.teamIds } },
          select: { userId: true }
        }).then((rows) => rows.map((row) => row.userId));

        for (const id of participantUserIds) {
          if (id === ctx.userId) continue;
          if (!allowedIds.includes(id)) {
            throw new ForbiddenException('Participants must belong to your team');
          }
        }
      }
    }

    const participantCreates = Array.from(participantUserIds).map((userId) => ({
      role: userId === ctx.userId ? ConversationParticipantRole.OWNER : ConversationParticipantRole.MEMBER,
      user: { connect: { id: userId } }
    }));

    const conversation = await this.prisma.conversation.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: ConversationType.INTERNAL,
        createdById: ctx.userId,
        participants: {
          create: participantCreates
        }
      }
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: 'conversation.created',
      actorId: ctx.userId,
      resource: { id: conversation.id, type: 'conversation' },
      occurredAt: new Date().toISOString(),
      data: {
        conversationId: conversation.id,
        type: conversation.type
      }
    });

    return this.fetchConversation(conversation.id, tenantId, ctx, { limit: 25 });
  }

  private async fetchConversation(
    conversationId: string,
    tenantId: string,
    ctx: RequestContext,
    options: { cursor?: string | null; limit?: number }
  ) {
    const { conversation, participant } = await this.ensureConversationAccess(conversationId, tenantId, ctx);

    const conversationWithLatest = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatarUrl: true
              }
            },
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                primaryEmail: true,
                primaryPhone: true
              }
            }
          }
        },
        person: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                memberships: { select: { teamId: true } }
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            attachments: true,
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!conversationWithLatest) {
      throw new NotFoundException('Conversation not found');
    }

    const unreadCount = participant
      ? await this.countUnread(conversation.id, participant.id, participant.lastReadAt ?? null, ctx.userId)
      : 0;

    const limit = Math.min(Math.max(options.limit ?? 25, 5), 100);
    const messageArgs: Prisma.MessageFindManyArgs = {
      where: {
        conversationId: conversation.id
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        attachments: true,
        receipts: true,
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    };

    if (options.cursor) {
      const cursorMessage = await this.prisma.message.findUnique({ where: { id: options.cursor } });
      if (!cursorMessage || cursorMessage.conversationId !== conversation.id) {
        throw new BadRequestException('Invalid message cursor');
      }
      messageArgs.cursor = { id: options.cursor };
      messageArgs.skip = 1;
    }

    const messages = await this.prisma.message.findMany(messageArgs);
    const hasMore = messages.length > limit;
    const sliced = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

    return {
      ...(this.mapToListItem(conversationWithLatest, unreadCount) as ConversationDetailView),
      messages: sliced.map((message) => this.toMessageView(message as MessageWithExtras, conversation.id)),
      pagination: {
        hasMore,
        nextCursor
      }
    } satisfies ConversationDetailView;
  }

  private async sendMessage(conversationId: string, dto: PostMessageDto & { tenantId: string }, ctx: RequestContext) {
    const { conversation, participant } = await this.ensureConversationAccess(conversationId, dto.tenantId, ctx, {
      requireWrite: true
    });

    if (!participant) {
      throw new ForbiddenException('You must join this conversation before posting');
    }

    if (conversation.type === ConversationType.EXTERNAL && conversation.person?.doNotContact) {
      throw new ForbiddenException('Contact has a do-not-contact flag; message blocked');
    }

    const attachments = (dto.attachmentTokens ?? []).map((token) => this.decodeAttachmentToken(token));
    for (const attachment of attachments) {
      if (attachment.tenantId !== dto.tenantId) {
        throw new BadRequestException('Attachment tenant mismatch');
      }
      if (attachment.conversationId !== conversation.id) {
        throw new BadRequestException('Attachment conversation mismatch');
      }
      if (attachment.size > this.maxAttachmentBytes) {
        throw new BadRequestException('Attachment exceeds maximum allowed size');
      }
      if (!this.allowedAttachmentTypes.has(attachment.mimeType)) {
        throw new BadRequestException('Attachment type not allowed');
      }
    }

    const recipients = conversation.participants.filter((item) => item.id !== participant.id);

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          tenantId: dto.tenantId,
          conversationId: conversation.id,
          personId: conversation.personId ?? null,
          userId: ctx.userId,
          channel: MessageChannel.IN_APP,
          direction: MessageDirection.OUTBOUND,
          body: dto.body,
          status: MessageStatus.DELIVERED
        }
      });

      if (attachments.length > 0) {
        await tx.messageAttachment.createMany({
          data: attachments.map((attachment) => ({
            id: randomUUID(),
            messageId: message.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
            storageKey: attachment.storageKey,
            checksum: attachment.checksum ?? null,
            scanned: false
          }))
        });
      }

      if (recipients.length > 0) {
        await tx.messageReceipt.createMany({
          data: recipients.map((recipient) => ({
            id: randomUUID(),
            messageId: message.id,
            participantId: recipient.id,
            status: MessageReceiptStatus.DELIVERED
          }))
        });
      }

      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: message.createdAt }
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: message.createdAt }
      });

      return message;
    });

    if (conversation.personId) {
      await this.prisma.activity.create({
        data: {
          tenantId: dto.tenantId,
          personId: conversation.personId,
          userId: ctx.userId,
          type: ActivityType.MESSAGE_SENT,
          payload: {
            messageId: createdMessage.id,
            channel: 'IN_APP',
            conversationId: conversation.id
          }
        }
      });
    }

    await this.outbox.enqueue({
      tenantId: dto.tenantId,
      eventType: 'message.sent',
      actorId: ctx.userId,
      resource: { id: createdMessage.id, type: 'message' },
      occurredAt: createdMessage.createdAt.toISOString(),
      data: {
        conversationId: conversation.id,
        personId: conversation.personId ?? undefined,
        channel: 'IN_APP'
      }
    });

    const messageWithRelations = await this.prisma.message.findUnique({
      where: { id: createdMessage.id },
      include: {
        attachments: true,
        receipts: true,
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
      }
    });

    if (!messageWithRelations) {
      throw new NotFoundException('Message not found');
    }

    return this.toMessageView(messageWithRelations as MessageWithExtras, conversation.id);
  }

  private async recordRead(
    conversationId: string,
    dto: MarkReadDto & { tenantId: string },
    ctx: RequestContext
  ) {
    const { conversation, participant } = await this.ensureConversationAccess(conversationId, dto.tenantId, ctx);
    if (!participant) {
      throw new ForbiddenException('You must be part of this conversation');
    }

    const messageFilter: Prisma.MessageWhereInput = {
      conversationId: conversation.id
    };
    if (dto.upToMessageId) {
      const target = await this.prisma.message.findUnique({
        where: { id: dto.upToMessageId },
        select: { id: true, conversationId: true, createdAt: true }
      });
      if (!target || target.conversationId !== conversation.id) {
        throw new BadRequestException('Invalid message reference');
      }
      messageFilter.createdAt = { lte: target.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where: messageFilter,
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true }
    });

    if (messages.length === 0) {
      return { conversationId: conversation.id, lastReadAt: participant.lastReadAt?.toISOString() ?? null };
    }

    const messageIds = messages.map((message) => message.id);
    const existingReads = await this.prisma.messageReceipt.findMany({
      where: {
        participantId: participant.id,
        status: MessageReceiptStatus.READ,
        messageId: { in: messageIds }
      },
      select: { messageId: true }
    });

    const alreadyReadIds = new Set(existingReads.map((entry) => entry.messageId));
    const toInsert = messages.filter((message) => !alreadyReadIds.has(message.id));

    const lastReadAt = messages[messages.length - 1]?.createdAt ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      if (toInsert.length > 0) {
        await tx.messageReceipt.createMany({
          data: toInsert.map((message) => ({
            id: randomUUID(),
            messageId: message.id,
            participantId: participant.id,
            status: MessageReceiptStatus.READ
          }))
        });
      }

      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: {
          lastReadAt: lastReadAt
        }
      });
    });

    if (toInsert.length > 0) {
      await Promise.all(
        toInsert.map(async (message) => {
          await this.outbox.enqueue({
            tenantId: dto.tenantId,
            eventType: 'message.read',
            actorId: ctx.userId,
            resource: { id: message.id, type: 'message' },
            occurredAt: new Date().toISOString(),
            data: {
              conversationId: conversation.id,
              messageId: message.id,
              participantId: participant.id
            }
          });

          if (conversation.personId) {
            await this.prisma.activity.create({
              data: {
                tenantId: dto.tenantId,
                personId: conversation.personId,
                userId: ctx.userId,
                type: ActivityType.MESSAGE_READ,
                payload: {
                  messageId: message.id,
                  conversationId: conversation.id
                }
              }
            });
          }

          const recipientCount = await this.prisma.messageReceipt.count({
            where: {
              messageId: message.id,
              status: MessageReceiptStatus.DELIVERED
            }
          });

          const readCount = await this.prisma.messageReceipt.count({
            where: {
              messageId: message.id,
              status: MessageReceiptStatus.READ
            }
          });

          if (recipientCount > 0 && readCount >= recipientCount) {
            await this.prisma.message.update({
              where: { id: message.id },
              data: { status: MessageStatus.READ }
            });
          }
        })
      );
    }

    return {
      conversationId: conversation.id,
      lastReadAt: lastReadAt.toISOString(),
      readCount: toInsert.length
    };
  }

  private async appendParticipants(
    conversationId: string,
    dto: AddParticipantsDto & { tenantId: string },
    ctx: RequestContext
  ) {
    const { conversation, participant } = await this.ensureConversationAccess(conversationId, dto.tenantId, ctx, {
      requireWrite: true
    });

    if (conversation.type !== ConversationType.INTERNAL) {
      throw new BadRequestException('Only internal conversations support participant management');
    }

    if (!participant || participant.role === ConversationParticipantRole.VIEWER) {
      throw new ForbiddenException('You cannot modify participants');
    }

    const uniqueIds = new Set(dto.userIds);
    for (const participantRecord of conversation.participants) {
      if (participantRecord.userId) {
        uniqueIds.delete(participantRecord.userId);
      }
    }

    if (uniqueIds.size === 0) {
      return this.fetchConversation(conversation.id, dto.tenantId, ctx, { limit: 25 });
    }

    const newIds = Array.from(uniqueIds);
    const users = await this.prisma.user.findMany({
      where: { id: { in: newIds }, tenantId: dto.tenantId },
      select: { id: true }
    });

    if (users.length !== newIds.length) {
      throw new BadRequestException('One or more participants are invalid');
    }

    if (ctx.role === UserRole.AGENT || ctx.role === UserRole.ISA) {
      if (!ctx.allowTeamContactActions) {
        throw new ForbiddenException('You cannot add participants to this conversation');
      }
      const allowedIds = await this.prisma.teamMembership.findMany({
        where: { teamId: { in: ctx.teamIds } },
        select: { userId: true }
      }).then((rows) => rows.map((row) => row.userId));

      for (const id of newIds) {
        if (!allowedIds.includes(id)) {
          throw new ForbiddenException('Participant must belong to your team');
        }
      }
    }

    await this.prisma.conversationParticipant.createMany({
      data: newIds.map((userId) => ({
        id: randomUUID(),
        conversationId: conversation.id,
        userId,
        role: ConversationParticipantRole.MEMBER
      }))
    });

    return this.fetchConversation(conversation.id, dto.tenantId, ctx, { limit: 25 });
  }

  private async pruneParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    ctx: RequestContext
  ) {
    const { conversation, participant } = await this.ensureConversationAccess(conversationId, tenantId, ctx, {
      requireWrite: true
    });

    if (conversation.type !== ConversationType.INTERNAL) {
      throw new BadRequestException('Only internal conversations support participant management');
    }

    const target = conversation.participants.find((item) => item.id === participantId && item.userId);
    if (!target) {
      return;
    }

    if (target.role === ConversationParticipantRole.OWNER) {
      throw new ForbiddenException('Cannot remove an owner from the conversation');
    }

    const canManage =
      ctx.role === UserRole.BROKER ||
      ctx.role === UserRole.TEAM_LEAD ||
      (participant && participant.role === ConversationParticipantRole.OWNER);

    if (!canManage) {
      throw new ForbiddenException('You cannot remove this participant');
    }

    await this.prisma.conversationParticipant.delete({ where: { id: participantId } });
  }

  private async prepareAttachment(
    conversationId: string,
    dto: UploadAttachmentDto & { tenantId: string },
    ctx: RequestContext
  ) {
    const { conversation } = await this.ensureConversationAccess(conversationId, dto.tenantId, ctx, {
      requireWrite: true
    });

    if (dto.size > this.maxAttachmentBytes) {
      throw new BadRequestException('Attachment exceeds maximum allowed size');
    }

    if (!this.allowedAttachmentTypes.has(dto.mimeType)) {
      throw new BadRequestException('File type not allowed');
    }

    const storageKey = dto.storageKey?.trim() && dto.storageKey.length > 0
      ? dto.storageKey
      : this.createStorageKey(conversationId, dto.filename);

    const payload: AttachmentTokenPayload = {
      tenantId: dto.tenantId,
      conversationId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      checksum: dto.checksum,
      storageKey,
      uploadedBy: ctx.userId,
      issuedAt: Date.now()
    };

    const token = this.signAttachmentToken(payload);

    return {
      token,
      storageKey,
      allowedMimeTypes: Array.from(this.allowedAttachmentTypes),
      maxSizeBytes: this.maxAttachmentBytes,
      expiresAt: new Date(payload.issuedAt + this.attachmentTtlMs).toISOString(),
      conversationId: conversation.id
    };
  }
  // endregion

  // region: helpers
  private async buildVisibilityFilter(
    tenantId: string,
    ctx: RequestContext,
    type?: ConversationType,
    search?: string
  ): Promise<Prisma.ConversationWhereInput> {
    const base: Prisma.ConversationWhereInput = {
      tenantId,
      type: type ?? undefined
    };

    const orFilters: Prisma.ConversationWhereInput[] = [];
    const andFilters: Prisma.ConversationWhereInput[] = [];
    const participantFilter: Prisma.ConversationWhereInput = {
      participants: { some: { userId: ctx.userId } }
    };

    switch (ctx.role) {
      case UserRole.BROKER:
        // Brokers can see everything within tenant.
        break;
      case UserRole.TEAM_LEAD: {
        orFilters.push(participantFilter);
        if (ctx.teamIds.length > 0) {
          orFilters.push({
            type: ConversationType.EXTERNAL,
            person: {
              owner: {
                memberships: {
                  some: { teamId: { in: ctx.teamIds } }
                }
              }
            }
          });
        }
        base.OR = orFilters.length > 0 ? orFilters : undefined;
        break;
      }
      case UserRole.MARKETING: {
        base.type = ConversationType.EXTERNAL;
        break;
      }
      case UserRole.LENDER: {
        base.participants = { some: { userId: ctx.userId } };
        break;
      }
      case UserRole.AGENT:
      case UserRole.ISA: {
        orFilters.push(participantFilter);
        orFilters.push({
          type: ConversationType.EXTERNAL,
          person: { ownerId: ctx.userId }
        });
        if (ctx.allowTeamContactActions && ctx.teamIds.length > 0) {
          orFilters.push({
            type: ConversationType.EXTERNAL,
            person: {
              owner: {
                memberships: {
                  some: { teamId: { in: ctx.teamIds } }
                }
              }
            }
          });
        }
        base.OR = orFilters;
        break;
      }
      default: {
        base.participants = { some: { userId: ctx.userId } };
      }
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      andFilters.push({
        OR: [
          { person: { firstName: { contains: term, mode: 'insensitive' } } },
          { person: { lastName: { contains: term, mode: 'insensitive' } } },
          { person: { primaryEmail: { contains: term, mode: 'insensitive' } } },
          { person: { primaryPhone: { contains: term, mode: 'insensitive' } } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { firstName: { contains: term, mode: 'insensitive' } },
                    { lastName: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } }
                  ]
                }
              }
            }
          }
        ]
      });
    }

    if (andFilters.length > 0) {
      base.AND = andFilters;
    }

    return base;
  }

  private async countUnread(
    conversationId: string,
    participantId: string,
    lastReadAt: Date | null,
    userId: string
  ) {
    const lastRead = lastReadAt ?? new Date(0);
    const unread = await this.prisma.message.count({
      where: {
        conversationId,
        createdAt: { gt: lastRead },
        OR: [{ userId: { not: userId } }, { userId: null }]
      }
    });
    return unread;
  }

  private mapToListItem(conversation: ConversationWithRelations, unreadCount: number) {
    const last = conversation.messages.at(0) ?? null;
    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      type: conversation.type,
      person: conversation.person ? this.toPersonSummary(conversation.person) : null,
      participants: conversation.participants.map((participant) => this.toParticipantView(participant)),
      lastMessage: last
        ? this.toMessageView(
            {
              ...last,
              receipts: []
            } as MessageWithExtras,
            conversation.id
          )
        : null,
      unreadCount,
      updatedAt: conversation.updatedAt.toISOString()
    } satisfies ConversationListItemView;
  }

  private toParticipantView(participant: ConversationParticipantRecord): ParticipantView {
    return {
      id: participant.id,
      role: participant.role,
      user: participant.user ? this.toUserSummary(participant.user) : null,
      person: participant.person ? this.toPersonSummary(participant.person) : null,
      joinedAt: participant.joinedAt.toISOString(),
      muted: participant.muted,
      lastReadAt: participant.lastReadAt ? participant.lastReadAt.toISOString() : null
    };
  }

  private toUserSummary(user: { id: string; firstName: string; lastName: string; email?: string | null; role?: UserRole | null; avatarUrl?: string | null }): UserSummary {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email ?? null,
      role: user.role ?? null,
      avatarUrl: user.avatarUrl ?? null
    };
  }

  private toPersonSummary(person: { id: string; firstName: string | null; lastName: string | null; primaryEmail: string | null; primaryPhone: string | null }): PersonSummary {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      primaryEmail: person.primaryEmail,
      primaryPhone: person.primaryPhone
    };
  }

  private toAttachmentView(attachment: { id: string; filename: string; mimeType: string; size: number; checksum: string | null; scanned: boolean; storageKey: string }, conversationId: string): AttachmentView {
    const signed = this.generateAttachmentUrl({
      conversationId,
      storageKey: attachment.storageKey
    });
    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      checksum: attachment.checksum,
      scanned: attachment.scanned,
      storageKey: attachment.storageKey,
      downloadUrl: signed?.url ?? null,
      expiresAt: signed?.expiresAt ?? null
    };
  }

  private toMessageView(message: MessageWithExtras, conversationId: string): MessageView {
    return {
      id: message.id,
      conversationId: message.conversationId ?? conversationId,
      userId: message.userId,
      personId: message.personId ?? null,
      body: message.body ?? null,
      createdAt: message.createdAt.toISOString(),
      status: message.status,
      direction: message.direction,
      attachments: message.attachments.map((attachment) => this.toAttachmentView(attachment, conversationId)),
      sender: message.user ? this.toUserSummary(message.user) : null,
      receipts: message.receipts?.map((receipt) => ({
        participantId: receipt.participantId,
        status: receipt.status,
        recordedAt: receipt.recordedAt.toISOString()
      }))
    };
  }

  private generateAttachmentUrl(input: { conversationId: string; storageKey: string }) {
    if (!input.storageKey) {
      return null;
    }
    const expiresAt = new Date(Date.now() + this.attachmentTtlMs);
    const basePayload = JSON.stringify({
      conversationId: input.conversationId,
      storageKey: input.storageKey,
      expiresAt: expiresAt.toISOString()
    });
    const signature = createHmac('sha256', this.attachmentSecret).update(basePayload).digest('hex');
    const token = Buffer.from(JSON.stringify({ payload: basePayload, signature })).toString('base64url');
    return {
      url: `/files/${encodeURIComponent(input.storageKey)}?token=${token}`,
      expiresAt: expiresAt.toISOString()
    };
  }

  private signAttachmentToken(payload: AttachmentTokenPayload) {
    const serialized = JSON.stringify(payload);
    const signature = createHmac('sha256', this.attachmentSecret).update(serialized).digest('hex');
    return Buffer.from(JSON.stringify({ payload: serialized, signature })).toString('base64url');
  }

  private decodeAttachmentToken(token: string): AttachmentTokenPayload {
    let decoded: { payload: string; signature: string };
    try {
      decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid attachment token');
    }

    const recomputed = createHmac('sha256', this.attachmentSecret).update(decoded.payload).digest('hex');
    if (recomputed !== decoded.signature) {
      throw new BadRequestException('Invalid attachment token signature');
    }

    let payload: AttachmentTokenPayload;
    try {
      payload = JSON.parse(decoded.payload) as AttachmentTokenPayload;
    } catch {
      throw new BadRequestException('Invalid attachment payload');
    }

    if (!payload.issuedAt) {
      throw new BadRequestException('Attachment token missing metadata');
    }

    if (Date.now() - payload.issuedAt > this.attachmentTtlMs) {
      throw new BadRequestException('Attachment token has expired');
    }

    return payload;
  }

  private createStorageKey(conversationId: string, filename: string) {
    const safeName = filename
      .toLowerCase()
      .replace(/[^a-z0-9\.\-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'file';
    return `in-app/${conversationId}/${randomUUID()}-${safeName}`;
  }
  // endregion
}
