import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@hatch/db';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
