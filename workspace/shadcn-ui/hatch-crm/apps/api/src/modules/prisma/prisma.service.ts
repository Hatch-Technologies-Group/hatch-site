import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@hatch/db';

import { getRequestContext } from '@/shared/request-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    const databaseUrl = config.get<string>('database.url');
    super({
      datasources: databaseUrl
        ? {
            db: { url: databaseUrl }
          }
        : undefined,
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']
    });

    const threshold = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 300);
    this.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;
      if (duration > threshold) {
        const ctx = getRequestContext();
        const requestLabel = ctx
          ? ` [${ctx.method ?? 'METHOD'} ${ctx.route ?? ctx.url ?? 'URL'} reqId=${ctx.reqId ?? 'n/a'}]`
          : '';
        this.logger.warn(
          `[Slow Query]${requestLabel} ${params.model ?? 'raw'}.${params.action} took ${duration}ms`
        );
      }
      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    const pgvectorLists = process.env.PGVECTOR_LISTS;
    if (pgvectorLists) {
      await this.$executeRaw`SELECT set_config('ai.pgvectors.lists', ${pgvectorLists}, false)`;
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
