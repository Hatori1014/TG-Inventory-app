import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
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
  // bufferLogs holds any log emitted before useLogger() runs below, instead
  // of losing it to the default console logger
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // TT-21 — replace Nest's default logger app-wide with the structured
  // (pino) one; every existing `new Logger(context)` call, including the
  // uncaughtException/unhandledRejection handlers above, starts emitting
  // structured JSON through this from here on
  app.useLogger(app.get(PinoLogger));

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

  // ADR-31 — besides the configured production frontend, also allow this
  // project's own Vercel preview deployments (staging branch, PR previews):
  // every push gets its own origin (tg-inventory-<hash>-hatori2.vercel.app,
  // tg-inventory-app-git-<branch>-hatori2.vercel.app), which a single fixed
  // origin can never match. Still an allowlist, not a wildcard — the regex
  // only matches subdomains under this specific Vercel project, which an
  // attacker can't provision without controlling this Vercel team.
  //
  // CORS_EXTRA_ORIGINS (optional, comma-separated) covers anything outside
  // that pattern — a custom domain, a non-Vercel staging host, etc. — as a
  // Render env var change (instant restart, no code push/build) instead of
  // a code change every time a new origin is needed.
  const configuredFrontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';
  const extraAllowedOrigins = (process.env.CORS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const vercelPreviewPattern = /^https:\/\/tg-inventory(-app)?[a-z0-9-]*\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser clients (curl, health checks)
      const allowed =
        origin === configuredFrontendUrl ||
        extraAllowedOrigins.includes(origin) ||
        vercelPreviewPattern.test(origin);
      callback(null, allowed);
    },
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
  logger.log(`Backend running at http://localhost:${port} (docs at /docs)`);
}
bootstrap();
