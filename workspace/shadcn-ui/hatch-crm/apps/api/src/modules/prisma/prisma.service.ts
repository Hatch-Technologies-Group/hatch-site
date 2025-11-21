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
    const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true';
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10);
    
    super({
      datasources: databaseUrl
        ? {
            db: { url: databaseUrl }
          }
        : undefined,
      log: enableQueryLogging 
        ? ['query', 'warn', 'error'] 
        : process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      connectionLimit,
    });
  }

  async onModuleInit() {
    await this.$connect();
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
