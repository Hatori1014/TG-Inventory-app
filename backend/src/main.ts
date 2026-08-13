import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

// TT-15 — the global exception filter only covers errors thrown inside the
// request/response cycle. An error thrown outside it (a rejected promise
// nobody awaited, a callback throwing async) would otherwise crash the
// whole process silently — every module goes down with it, not just the
// one that misbehaved. Log it and exit so Render restarts the container
// in a known state, instead of limping along zombied.
process.on('uncaughtException', (error) => {
  logger.error('uncaughtException — shutting down', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason.stack : reason;
  logger.error('unhandledRejection — shutting down', error);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HU-22 — security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet());

  // HU-21 — strict validation of all input, based on each module's DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  });

  // OpenAPI/Swagger docs (plan section 4.3)
  const config = new DocumentBuilder()
    .setTitle('Inventory Control System API')
    .setDescription('See plan-inicial-proyecto-inventario.md, section 7.4, for the full spec by module')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend running at http://localhost:${port} (docs at /docs)`);
}
bootstrap();
