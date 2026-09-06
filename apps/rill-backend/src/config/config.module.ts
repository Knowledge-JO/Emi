import { Module } from '@nestjs/common';

// TODO: Wrap @nestjs/config as a global module: load app.config, validate with env.schema,
// disable env file loading in production.
@Module({})
export class AppConfigModule {}
