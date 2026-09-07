import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { validationPipe } from '../src/common/validation.pipe';
import { DRIZZLE, POSTGRES_CLIENT } from '../src/database/drizzle.provider';
import { intents, users } from '../src/database/schema';
import { EmbeddingModel } from '../src/modules/ai/embedding-model';
import { LanguageModel } from '../src/modules/ai/language-model';
import { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';

/**
 * Boots the real module graph with the things a test environment does not have: Postgres, Privy,
 * and a live model. Everything else — config validation, guards, routing — runs for real.
 */
export async function createTestApp(
  overrides: {
    database?: unknown;
    privy?: PrivyIdentity;
    languageModel?: LanguageModel;
    embeddingModel?: EmbeddingModel;
  } = {},
): Promise<INestApplication<App>> {
  applyTestEnv();

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(POSTGRES_CLIENT)
    .useValue(fakePostgresClient())
    .overrideProvider(DRIZZLE)
    .useValue(overrides.database ?? new FakeDatabase())
    .overrideProvider(PrivyIdentity)
    .useValue(overrides.privy ?? unusablePrivy());

  if (overrides.languageModel) {
    builder = builder
      .overrideProvider(LanguageModel)
      .useValue(overrides.languageModel);
  }
  if (overrides.embeddingModel) {
    builder = builder
      .overrideProvider(EmbeddingModel)
      .useValue(overrides.embeddingModel);
  }

  const fixture = await builder.compile();
  const app = fixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(validationPipe());
  await app.init();

  return app;
}

/** Placeholder values that satisfy env validation without pointing anywhere real. */
function applyTestEnv(): void {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://localhost:5432/rill_test',
    REDIS_URL: 'redis://localhost:6379',
    BSC_RPC_URL: 'https://bsc-dataseed.example',
    PRIVY_APP_ID: 'test-app-id',
    PRIVY_VERIFICATION_KEY: 'test-verification-key',
    X402_FACILITATOR_URL: 'https://facilitator.example',
    X402_MERCHANT_ADDRESS: '0x1111111111111111111111111111111111111111',
    ERC8183_ESCROW_ADDRESS: '0x2222222222222222222222222222222222222222',
    ERC8004_REGISTRY_ADDRESS: '0x3333333333333333333333333333333333333333',
    AI_PROVIDER: 'gemini',
    AI_EMBEDDING_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-gemini-key',
  });
}

/** Answers the two boot-time checks in `DatabaseBootstrap`, and closes like a real pool. */
function fakePostgresClient() {
  const client = jest
    .fn()
    .mockResolvedValueOnce([{ installed: true }])
    .mockResolvedValueOnce([{ count: 3 }]);

  return Object.assign(client, { end: jest.fn().mockResolvedValue(undefined) });
}

function unusablePrivy(): PrivyIdentity {
  return {
    verifyAccessToken: () => {
      throw new Error('This test did not configure a Privy stub');
    },
    readProfile: () => {
      throw new Error('This test did not configure a Privy stub');
    },
  };
}

type Row = Record<string, unknown>;

/**
 * Just enough of the Drizzle client for the signed-in routes. Deliberately dumb: only one user
 * is ever in play, so `findFirst` does not need to interpret a where clause.
 */
export class FakeDatabase {
  users: Row[] = [];
  events: Row[] = [];
  intents: Row[] = [];

  query = {
    users: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(this.users[0]),
    },
    intents: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.intents[0]),
    },
  };

  insert(table: unknown) {
    const rows =
      table === users
        ? this.users
        : table === intents
          ? this.intents
          : this.events;

    const build = (values: Row): Row => {
      if (table === users) {
        return {
          id: 'user-1',
          status: 'active',
          displayName: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          lastSeenAt: null,
          ...values,
        };
      }
      if (table === intents) {
        return {
          id: 'intent-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          ...values,
        };
      }
      return {
        seq: rows.length + 1,
        eventId: `event-${rows.length + 1}`,
        ...values,
      };
    };

    const append = (values: Row): Promise<Row[]> => {
      const row = build(values);
      rows.push(row);
      return Promise.resolve([row]);
    };

    return {
      values: (values: Row) => ({
        returning: () => append(values),
        onConflictDoNothing: () => ({
          returning: () =>
            this.users.length > 0 ? Promise.resolve([]) : append(values),
        }),
      }),
    };
  }

  update(table: unknown) {
    void table;
    return {
      set: (values: Row) => ({
        where: () => ({
          returning: () => {
            this.users[0] = { ...this.users[0], ...values };
            return Promise.resolve([this.users[0]]);
          },
        }),
      }),
    };
  }
}
