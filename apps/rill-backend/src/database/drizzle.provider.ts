import {
  Inject,
  Injectable,
  Logger,
  type FactoryProvider,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { RillConfigService } from '../config/app.config';
import * as schema from './schema';

export const POSTGRES_CLIENT = 'POSTGRES_CLIENT';
export const DRIZZLE = 'DRIZZLE';

export type PostgresClient = postgres.Sql;
export type Database = PostgresJsDatabase<typeof schema>;

/** `constructor(@InjectDatabase() private readonly db: Database) {}` */
export const InjectDatabase = () => Inject(DRIZZLE);

/**
 * The connection pool. Held behind its own token so exactly one thing owns the socket: the
 * Drizzle client borrows it, and `DatabasePool` closes it.
 */
export const postgresClientProvider: FactoryProvider<PostgresClient> = {
  provide: POSTGRES_CLIENT,
  inject: [ConfigService],
  useFactory: (config: RillConfigService) =>
    postgres(config.get('database.url', { infer: true }), {
      max: config.get('database.poolMax', { infer: true }),
      ssl: config.get('database.ssl', { infer: true }) ? 'require' : false,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
    }),
};

export const drizzleProvider: FactoryProvider<Database> = {
  provide: DRIZZLE,
  inject: [POSTGRES_CLIENT, ConfigService],
  useFactory: (client: PostgresClient, config: RillConfigService) =>
    drizzle(client, {
      schema,
      logger: !config.get('app.isProduction', { infer: true }),
    }),
};

/**
 * Drains the pool on shutdown. In-flight statements get a few seconds to finish, because a
 * process killed mid-transaction while settling a payment leaves the ledger disagreeing with
 * the chain.
 */
@Injectable()
export class DatabasePool implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabasePool.name);

  constructor(
    @Inject(POSTGRES_CLIENT) private readonly client: PostgresClient,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
    this.logger.log('Postgres pool closed');
  }
}
