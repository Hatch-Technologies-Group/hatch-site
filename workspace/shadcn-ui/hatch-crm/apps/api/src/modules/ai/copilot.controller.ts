import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

import { AiService } from './ai.service';

@Controller('ai/copilot')
@UseGuards(JwtAuthGuard)
export class CopilotController {
  constructor(private readonly ai: AiService) {}

  @Get('threads/:threadId')
  async getThread(@Param('threadId') threadId: string) {
    return {
      threadId,
      messages: [],
      snippets: [],
      citations: []
    };
  }

  @Post('chat')
  async chat(
    @Body()
    body: {
      messages: Array<{ role: string; content: string }>;
      context?: Record<string, unknown>;
      stream?: boolean;
      threadId?: string;
    },
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ) {
    const stream = body.stream !== false;
    const user = (req as any).user ?? {};
    const tenantId = user.tenantId ?? body.context?.['tenantId'];

    const base = await this.ai.chat({
      userId: user.id ?? 'anonymous',
      threadId: body.threadId,
      messages: body.messages,
      context: { ...(body.context ?? {}), tenantId },
      stream
    });

    const finalAssistant = [...(base.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'assistant' && typeof message.content === 'string');

    if (!stream) {
      res.header('X-Prompt-Version', base.promptVersion ?? 'v3.0');
      return res.type('application/json').send({
        messages: base.messages ?? [],
        snippets: base.snippets,
        citations: base.citations,
        response: finalAssistant?.content ?? 'Thinking…'
      });
    }

    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    res.raw.write(`event: meta\ndata: ${JSON.stringify({ promptVersion: base.promptVersion ?? 'v3.0' })}\n\n`);

    if (finalAssistant && typeof finalAssistant.content === 'string') {
      res.raw.write(`data: ${JSON.stringify({ delta: finalAssistant.content })}\n\n`);
    }

    const finalPayload = {
      done: true,
      promptVersion: base.promptVersion ?? 'v3.0',
      citations: base.citations,
      snippets: base.snippets
    };
    res.raw.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
    res.raw.write('data: [DONE]\n\n');
    res.raw.end();
  }
}
