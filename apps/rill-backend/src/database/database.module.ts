import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
} from '@nestjs/common';

import {
  DRIZZLE,
  DatabasePool,
  POSTGRES_CLIENT,
  drizzleProvider,
  postgresClientProvider,
  type PostgresClient,
} from './drizzle.provider';

/**
 * Refuses to serve traffic against a database the code does not match. Both checks exist because
 * the failure they prevent is silent: without `pgvector` every discovery query fails at request
 * time, and against an unmigrated database the first write fails on a missing column.
 */
@Injectable()
class DatabaseBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrap.name);

  constructor(
    @Inject(POSTGRES_CLIENT) private readonly client: PostgresClient,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const [extension] = await this.client<{ installed: boolean }[]>`
      select exists (select 1 from pg_extension where extname = 'vector') as installed
    `;

    if (!extension?.installed) {
      throw new Error(
        'pgvector is not installed. Apply migrations in order — 0000_enable_pgvector runs first.',
      );
    }

    const applied = await this.client<{ count: number }[]>`
      select count(*)::int as count from drizzle.__drizzle_migrations
    `.catch(() => {
      throw new Error(
        'No migrations have been applied. Run `npm run db:migrate` first.',
      );
    });

    this.logger.log(
      `Database ready, ${applied[0]?.count ?? 0} migrations applied`,
    );
  }
}

/**
 * Exposes the Drizzle client to the whole application. Every module reads and writes through the
 * injected client and never opens a connection of its own, so pooling, logging and shutdown stay
 * in one place.
 */
@Global()
@Module({
  providers: [
    postgresClientProvider,
    drizzleProvider,
    DatabasePool,
    DatabaseBootstrap,
  ],
  exports: [DRIZZLE, POSTGRES_CLIENT],
})
export class DatabaseModule {}
