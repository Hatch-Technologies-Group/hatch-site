import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';
import { SemanticSearchService } from '../src/modules/search/semantic.service';
import type { GoldenEval } from '../ai-evals/types';

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ text: '', info: {} }))
}));

jest.mock('@/jobs/insights-refresh.job', () => {
  const queueMock = {
    add: jest.fn(),
    getJob: jest.fn()
  };
  return {
    queueConnection: {},
    INSIGHTS_REFRESH_QUEUE: 'insights.refresh',
    insightsRefreshQueue: queueMock,
    enqueueInsightsRefresh: jest.fn()
  };
});

describe('AI Golden Evals', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ai: AiService;
  const tenantId = process.env.DEFAULT_TENANT_ID || 'test_tenant_1';

  beforeAll(async () => {
    const semanticMock: SemanticSearchService = {
      search: jest.fn(async () => [
        {
          id: 'mock-snippet',
          content:
            'Client discussed recent activity and is expecting concrete next steps. Mention calling and emailing follow-ups.',
          entityType: 'lead',
          entityId: 'lead_test',
          score: 0.9,
          meta: null
        }
      ])
    } as unknown as SemanticSearchService;

    moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(SemanticSearchService)
      .useValue(semanticMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    ai = moduleRef.get(AiService);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const goldensDir = path.join(__dirname, '..', 'ai-evals', 'goldens');
  const files = fs
    .readdirSync(goldensDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));

  if (files.length === 0) {
    it('has at least one golden file', () => {
      throw new Error('No golden eval files found in ai-evals/goldens.');
    });
    return;
  }

  for (const file of files) {
    const raw = fs.readFileSync(path.join(goldensDir, file), 'utf8');
    const golden = yaml.load(raw) as GoldenEval;
    const testName = golden.name || file;

    it(
      `golden: ${testName}`,
      async () => {
        const ctxBase = golden.context ?? {};
        const ctx = {
          ...ctxBase,
          tenantId: ctxBase.tenantId ?? tenantId
        };

        const resp = await ai.chat({
          userId: 'ai-eval',
          threadId: undefined,
          messages: golden.inputs.messages,
          context: ctx,
          stream: false
        });

        const assistant = resp.messages[resp.messages.length - 1];
        const answer =
          typeof assistant?.content === 'string'
            ? assistant.content
            : assistant?.content
              ? JSON.stringify(assistant.content)
              : '';

        const mustInclude = golden.expect.must_include ?? [];
        const mustNotInclude = golden.expect.must_not_include ?? [];
        const normalize = (value: string) => value.toLowerCase();
        const includesPhrase = (haystack: string, needle: string) =>
          normalize(haystack).includes(normalize(needle));

        const missing = mustInclude.filter((phrase) => !includesPhrase(answer, phrase));
        const forbidden = mustNotInclude.filter((phrase) => includesPhrase(answer, phrase));

        if (missing.length || forbidden.length) {
          const reasons: string[] = [];
          if (missing.length) {
            reasons.push(`Missing phrases: ${missing.join(', ')}`);
          }
          if (forbidden.length) {
            reasons.push(`Forbidden phrases present: ${forbidden.join(', ')}`);
          }

          throw new Error(
            `Golden eval failed for ${testName}.\n${reasons.join('\n')}\n\nAnswer was:\n${answer}`
          );
        }
      },
      90_000
    );
  }
});
