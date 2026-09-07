import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validationPipe } from './common/validation.pipe';
import type { RillConfigService } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Required for the Postgres pool to drain instead of being cut off mid-statement.
  app.enableShutdownHooks();
  app.useGlobalPipes(validationPipe());

  const config: RillConfigService = app.get(ConfigService);

  // The browser app sends Privy access tokens cross-origin. `credentials` covers the cookie mode,
  // where the token rides in a `privy-token` cookie instead of a header.
  app.enableCors({
    origin: config.get('app.webOrigins', { infer: true }),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'privy-id-token'],
  });

  await app.listen(config.get('app.port', { infer: true }));
}
void bootstrap();
