import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { validationPipe } from '../src/common/validation.pipe';
import { DRIZZLE, POSTGRES_CLIENT } from '../src/database/drizzle.provider';
import {
  eventOutbox,
  events,
  intents,
  reputation,
  users,
  x402Payments,
} from '../src/database/schema';
import type { X402Facilitator } from '../src/modules/commerce/x402/x402-facilitator';
import { X402_FACILITATOR } from '../src/modules/commerce/x402/x402-facilitator';
import { EmbeddingModel } from '../src/modules/ai/embedding-model';
import { LanguageModel } from '../src/modules/ai/language-model';
import { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { MarketplaceMatchingService } from '../src/modules/marketplace/marketplace-matching.service';
import type { MatchIntentResult } from '../src/modules/marketplace/matching.types';
import type { Erc8183ChainReader } from '../src/modules/commerce/erc8183/erc8183-read';
import { ERC8183_CHAIN_READER } from '../src/modules/commerce/erc8183/erc8183-read';
import type { Erc8004ChainReader } from '../src/modules/identity/erc8004-read';
import { ERC8004_CHAIN_READER } from '../src/modules/identity/erc8004-read';
import {
  CHAIN_PUBLIC_CLIENT,
  type ChainPublicClient,
} from '../src/modules/blockchain/chain-client.provider';
import { OrchestratorService } from '../src/modules/orchestrator/orchestrator.service';

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
    matching?: Pick<
      MarketplaceMatchingService,
      'matchIntent' | 'listForIntent'
    >;
    orchestrator?: Pick<
      OrchestratorService,
      | 'planForUser'
      | 'getPlanForUser'
      | 'grantForUser'
      | 'executeForUser'
      | 'revokeForUser'
    >;
    erc8004Reader?: Erc8004ChainReader;
    erc8183Reader?: Erc8183ChainReader;
    chainClient?: ChainPublicClient;
    x402Facilitator?: X402Facilitator;
  } = {},
): Promise<INestApplication<App>> {
  applyTestEnv();

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(POSTGRES_CLIENT)
    .useValue(fakePostgresClient())
    .overrideProvider(DRIZZLE)
    .useValue(overrides.database ?? new FakeDatabase())
    .overrideProvider(PrivyIdentity)
    .useValue(overrides.privy ?? unusablePrivy())
    .overrideProvider(MarketplaceMatchingService)
    .useValue(overrides.matching ?? unmatchedStub())
    .overrideProvider(CHAIN_PUBLIC_CLIENT)
    .useValue(overrides.chainClient ?? silentChainClient());

  if (overrides.orchestrator) {
    builder = builder
      .overrideProvider(OrchestratorService)
      .useValue(overrides.orchestrator);
  }

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
  if (overrides.erc8004Reader) {
    builder = builder
      .overrideProvider(ERC8004_CHAIN_READER)
      .useValue(overrides.erc8004Reader);
  }
  if (overrides.erc8183Reader) {
    builder = builder
      .overrideProvider(ERC8183_CHAIN_READER)
      .useValue(overrides.erc8183Reader);
  }

  builder = builder
    .overrideProvider(X402_FACILITATOR)
    .useValue(overrides.x402Facilitator ?? rejectingFacilitator());

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

type InsertValues = {
  returning: () => Promise<Row[]>;
  onConflictDoNothing: () => { returning: () => Promise<Row[]> };
  then?: (
    resolve: (value: Row[]) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

type UpdateWhere = {
  returning: () => Promise<Row[]>;
  then?: (
    resolve: (value: Row[]) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

/**
 * Just enough of the Drizzle client for the signed-in routes. Deliberately dumb: only one user
 * is ever in play, so `findFirst` does not need to interpret a where clause.
 */
export class FakeDatabase {
  users: Row[] = [];
  events: Row[] = [];
  eventOutbox: Row[] = [];
  intents: Row[] = [];
  x402Payments: Row[] = [];
  reputationRows: Row[] = [];

  query = {
    users: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(this.users[0]),
    },
    intents: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.intents[0]),
    },
    agents: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    developers: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    agentIdentities: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    authorizations: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    indexerCursors: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    transactions: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    apiKeys: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    capabilities: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    reputation: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.reputationRows[0]),
    },
    events: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.events[0]),
      findMany: (): Promise<Row[]> => Promise.resolve(this.events),
    },
    eventOutbox: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.eventOutbox[0]),
      findMany: (): Promise<Row[]> => Promise.resolve(this.eventOutbox),
    },
    recommendations: {
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    workflows: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    wallets: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    sessions: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    jobs: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
      findMany: (): Promise<Row[]> => Promise.resolve([]),
    },
    jobDeliverables: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    assets: {
      findFirst: (): Promise<Row | undefined> => Promise.resolve(undefined),
    },
    x402Payments: {
      findFirst: (): Promise<Row | undefined> =>
        Promise.resolve(this.x402Payments[0]),
      findMany: (): Promise<Row[]> => Promise.resolve(this.x402Payments),
    },
  };

  transaction<T>(fn: (db: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  insert(table: unknown): { values: (values: Row) => InsertValues } {
    const rows =
      table === users
        ? this.users
        : table === intents
          ? this.intents
          : table === x402Payments
            ? this.x402Payments
            : table === eventOutbox
              ? this.eventOutbox
              : table === reputation
                ? this.reputationRows
                : table === events
                  ? this.events
                  : this.events;

    const build = (values: Row): Row => {
      if (table === eventOutbox) {
        return {
          id: `outbox-${this.eventOutbox.length + 1}`,
          status: 'pending',
          attempts: 0,
          ...values,
        };
      }
      if (table === reputation) {
        return {
          id: `rep-${this.reputationRows.length + 1}`,
          window: 'lifetime',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          ...values,
        };
      }
      if (table === x402Payments) {
        return {
          id: `x402-${this.x402Payments.length + 1}`,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          ...values,
        };
      }
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
      values: (values: Row) => {
        let done: Promise<Row[]> | null = null;
        const once = () => {
          if (!done) done = append(values);
          return done;
        };
        return {
          then: (
            resolve: (value: Row[]) => unknown,
            reject?: (reason: unknown) => unknown,
          ) => once().then(resolve, reject),
          returning: () => once(),
          onConflictDoNothing: () => ({
            returning: () =>
              table === users && this.users.length > 0
                ? Promise.resolve([])
                : once(),
          }),
        };
      },
    };
  }

  delete() {
    return {
      where: () => Promise.resolve([]),
    };
  }

  update(table: unknown): { set: (values: Row) => { where: () => UpdateWhere } } {
    return {
      set: (values: Row) => ({
        where: () => {
          const apply = (list: Row[]) => {
            if (list[0]) list[0] = { ...list[0], ...values };
            return Promise.resolve(list[0] ? [list[0]] : []);
          };
          const run = () => {
            if (table === intents) {
              const index = this.intents.length - 1;
              if (index >= 0) {
                this.intents[index] = { ...this.intents[index], ...values };
              }
              return Promise.resolve(
                this.intents[index] ? [this.intents[index]] : [],
              );
            }
            if (table === eventOutbox) return apply(this.eventOutbox);
            if (table === reputation) return apply(this.reputationRows);
            if (table === users) return apply(this.users);
            return Promise.resolve([]);
          };
          const done = run();
          return Object.assign(done, { returning: () => done });
        },
      }),
    };
  }
}

/**
 * e2e has no catalog, so discovery cannot run. The stub still reports the graph's taxonomy keys
 * as unmatched — the same shape a seeded SwapMaster miss would have, without touching SQL.
 */
function rejectingFacilitator(): X402Facilitator {
  return {
    verify: () =>
      Promise.resolve({ valid: false, invalidReason: 'test facilitator rejects' }),
    settle: () =>
      Promise.resolve({ success: false, error: 'test facilitator rejects' }),
  };
}

/** Never dials RPC. e2e and unit boots share this so tests do not need a live node. */
export function silentChainClient(): ChainPublicClient {
  return {
    chain: { id: 56 },
    readContract: (async ({ functionName }: { functionName: string }) => {
      if (functionName === 'isValidKey') return false;
      if (functionName === 'getKeys') return [];
      throw new Error(`test chain client has no ${functionName}`);
    }) as ChainPublicClient['readContract'],
    getBlockNumber: async () => 0n,
    getTransactionReceipt: async () => {
      throw new Error('test chain client has no receipt');
    },
    getLogs: async () => [],
  };
}

function unmatchedStub(): Pick<
  MarketplaceMatchingService,
  'matchIntent' | 'listForIntent'
> {
  return {
    matchIntent: (input) => {
      const result: MatchIntentResult = {
        matches: [],
        unmatchedTaxonomyKeys: input.graph.map((node) => node.taxonomyKey),
      };
      return Promise.resolve(result);
    },
    listForIntent: () => Promise.resolve([]),
  };
}
