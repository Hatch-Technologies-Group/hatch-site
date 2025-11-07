import { Controller, Get } from '@nestjs/common';

import { AiConfig } from '@/config/ai.config';
import { getAiMetrics } from '@/modules/ai/interceptors/ai-circuit.interceptor';

@Controller('ai')
export class AiController {
  @Get('health')
  health() {
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    return {
      ok: true,
      provider: 'openai',
      hasKey,
      model: AiConfig.model,
      timeoutMs: AiConfig.timeoutMs,
      metrics: getAiMetrics()
    };
  }
}
