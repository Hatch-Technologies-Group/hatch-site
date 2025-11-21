import cors, { type FastifyCorsOptions, type FastifyCorsOptionsDelegate } from '@fastify/cors';
import helmet, { type FastifyHelmetOptions } from '@fastify/helmet';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

let cachedServer: any = null;
let appPromise: Promise<NestFastifyApplication> | null = null;

async function createApp(): Promise<NestFastifyApplication> {
  const enableRequestLogging = process.env.ENABLE_REQUEST_LOGGING === 'true';
  const enableSwagger = process.env.DISABLE_SWAGGER !== 'true';
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ 
      logger: enableRequestLogging,
      disableRequestLogging: !enableRequestLogging,
      trustProxy: true,
    })  );

  app.setGlobalPrefix('api');

  const helmetOptions: FastifyHelmetOptions = { contentSecurityPolicy: false };
  await app.register(helmet as unknown as Parameters<typeof app.register>[0], helmetOptions);

  const corsOptions: FastifyCorsOptions = {
    origin: true,
    credentials: true
  } satisfies FastifyCorsOptions;
  await app.register(
    cors as unknown as Parameters<typeof app.register>[0],
    corsOptions as FastifyCorsOptions | FastifyCorsOptionsDelegate
  );

  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  if (enableSwagger && process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Hatch CRM API')
      .setDescription('API surface for Hatch CRM MVP')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.init();

  return app;
}

async function ensureServer() {
  if (!cachedServer) {
    appPromise = appPromise ?? createApp();
    const app = await appPromise;
    cachedServer = app.getHttpAdapter().getInstance();
  }

  return cachedServer;
}

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 4000;
  const host = configService.get<string>('app.host') ?? '0.0.0.0';

  await app.listen({ port, host });
}

if (!process.env.VERCEL) {
  void bootstrap();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fastifyInstance = await ensureServer();
  await fastifyInstance.ready();
  return fastifyInstance.routing(req, res);
}
