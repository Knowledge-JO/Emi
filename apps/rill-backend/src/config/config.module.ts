import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './app.config';

/**
 * Global configuration. `appConfig` validates the environment as it loads, so an invalid
 * deployment dies during bootstrap. In production the process environment is the only source —
 * a stray `.env` on a server must not be able to change which chain or escrow we point at.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
})
export class AppConfigModule {}
