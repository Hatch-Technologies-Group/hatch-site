import { Body, Controller, Get, Param, Post, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from '@nestjs/passport';

import { Permit } from '@/platform/security/permit.decorator';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiService } from '@/modules/ai/ai.service';
import { AiRateLimitGuard } from '@/modules/ai/guards/rate-limit.guard';
import { AiCircuitInterceptor } from '@/modules/ai/interceptors/ai-circuit.interceptor';

type AutoContactPurpose = 'intro' | 'tour' | 'price_drop' | 'checkin';

type ActivityRow = {
  id: string;
  type: string;
  ts: Date | string;
  meta: Record<string, unknown> | null;
};

@Controller('contacts/:contactId/activity')
@UseGuards(AuthGuard('oidc'))
export class ContactActivityController {
  constructor(private readonly db: PrismaService, private readonly ai: AiService) {}

  @Get('stream')
  @Permit('contacts', 'read')
  async stream(@Param('contactId') contactId: string, @Res() reply: FastifyReply) {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders?.();
    reply.hijack();

    const res = reply.raw;
    const seenIds = new Set<string>();

    const recent = await this.db.$queryRawUnsafe<ActivityRow[]>(
      `
        SELECT a.id, a.type, a.ts, a.meta
        FROM activity a
        WHERE a.contact_id = $1
        ORDER BY a.ts DESC, a.id DESC
        LIMIT 20
      `,
      contactId
    );

    const bootstrap = recent.slice().reverse();
    bootstrap.forEach((item) => seenIds.add(item.id));
    res.write(`event: bootstrap\ndata:${JSON.stringify(bootstrap)}\n\n`);

    let lastTimestamp =
      bootstrap.length > 0
        ? parseTimestamp(bootstrap[bootstrap.length - 1]!.ts)
        : Date.now();

    const poll = async () => {
      try {
        const next = await this.db.$queryRawUnsafe<ActivityRow[]>(
          `
            SELECT a.id, a.type, a.ts, a.meta
            FROM activity a
            WHERE a.contact_id = $1
              AND a.ts >= to_timestamp(${lastTimestamp} / 1000.0)
            ORDER BY a.ts ASC, a.id ASC
            LIMIT 50
          `,
          contactId
        );

        const fresh: ActivityRow[] = [];

        for (const row of next) {
          if (seenIds.has(row.id)) {
            continue;
          }
          seenIds.add(row.id);
          const ts = parseTimestamp(row.ts);
          if (ts >= lastTimestamp) {
            lastTimestamp = ts;
          }
          fresh.push(row);
        }

        if (fresh.length > 0) {
          res.write(`event: tick\ndata:${JSON.stringify(fresh)}\n\n`);
        }
      } catch {
        res.write(`event: error\ndata:${JSON.stringify({ message: 'poll_failed' })}\n\n`);
      }
    };

    const activityInterval = setInterval(() => {
      void poll();
    }, 5_000);
    activityInterval.unref?.();

    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 15_000);
    keepAlive.unref?.();

    const teardown = () => {
      clearInterval(activityInterval);
      clearInterval(keepAlive);
    };

    registerStreamCleanup(reply, teardown);
    void poll();
  }

  @UseGuards(AiRateLimitGuard)
  @UseInterceptors(AiCircuitInterceptor)
  @Post('auto-contact')
  @Permit('contacts', 'update')
  async autoContact(
    @Param('contactId') contactId: string,
    @Body() body: { purpose?: AutoContactPurpose; context?: unknown }
  ) {
    const purpose = (body?.purpose ?? 'checkin') as AutoContactPurpose;
    const { text } = await this.ai.draftMessage({ contactId, purpose, context: body?.context });
    return { draft: { text } };
  }
}

function parseTimestamp(value: Date | string): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  return Date.parse(value);
}

function registerStreamCleanup(reply: FastifyReply, callback: () => void) {
  const request = reply.request.raw;
  const response = reply.raw;

  const handleClose = () => {
    cleanup();
    callback();
  };

  const cleanup = () => {
    request.off('close', handleClose);
    request.off('error', handleClose);
    response.off('close', handleClose);
    response.off('error', handleClose);
  };

  request.on('close', handleClose);
  request.on('error', handleClose);
  response.on('close', handleClose);
  response.on('error', handleClose);
}
