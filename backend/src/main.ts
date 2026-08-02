import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

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
