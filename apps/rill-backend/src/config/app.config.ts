import type { ConfigService } from '@nestjs/config';

import { validateEnv, type Env } from './env.schema';

/**
 * Typed configuration, grouped into namespaces so a module injects the section it owns rather
 * than reaching for raw env vars. Validation happens here, at load time: the factory throws and
 * Nest never finishes booting.
 */
export const appConfig = () => buildConfig(validateEnv(process.env));

/**
 * Kept here rather than read from `@altananetwork/sdk`, which is ESM-only and so cannot be
 * imported by this CommonJS build. The browser reads the same chain from the SDK directly, and
 * the wallet module checks a registration's chain against this value — so a mismatch between the
 * two surfaces as a rejected registration instead of a wallet recorded on a chain we do not serve.
 */
const ALTANA_CHAIN_IDS = {
  bnb: 56,
  'bnb-testnet': 97,
  ethereum: 1,
} as const;

/** Keystore addresses from the Altana SDK docs. Kept here because the SDK is ESM-only. */
const ALTANA_KEYSTORES = {
  bnb: '0x6572427ed530badcf7375cf9a4709d8d2b0e7e0a',
  'bnb-testnet': '0x6b8361c29d05d498b1a12b54a37310f94171e94a',
  ethereum: '0xb70fda90c1d576ba8399946a0c10ecd9d9ea923b',
} as const;

const buildConfig = (env: Env) =>
  ({
    app: {
      env: env.NODE_ENV,
      isProduction: env.NODE_ENV === 'production',
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
      webOrigins: env.WEB_ORIGINS,
    },
    database: {
      url: env.DATABASE_URL,
      poolMax: env.DATABASE_POOL_MAX,
      ssl: env.DATABASE_SSL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    temporal: {
      address: env.TEMPORAL_ADDRESS,
      namespace: env.TEMPORAL_NAMESPACE,
      taskQueue: env.TEMPORAL_TASK_QUEUE,
    },
    chain: {
      rpcUrl: env.BSC_RPC_URL,
      chainId: env.BSC_CHAIN_ID,
    },
    altana: {
      chain: env.ALTANA_CHAIN,
      chainId: ALTANA_CHAIN_IDS[env.ALTANA_CHAIN],
      secretProvider: env.SESSION_SECRET_PROVIDER,
      secretDir: env.SESSION_SECRET_DIR,
      keyStore:
        env.ALTANA_KEYSTORE_ADDRESS ?? ALTANA_KEYSTORES[env.ALTANA_CHAIN],
    },
    privy: {
      appId: env.PRIVY_APP_ID,
      verificationKey: env.PRIVY_VERIFICATION_KEY,
    },
    x402: {
      facilitatorUrl: env.X402_FACILITATOR_URL,
      merchantAddress: env.X402_MERCHANT_ADDRESS,
    },
    erc8183: {
      escrowAddress:
        env.ALTANA_CHAIN === 'bnb-testnet'
          ? (env.ERC8183_ESCROW_ADDRESS_TESTNET ?? env.ERC8183_ESCROW_ADDRESS)
          : env.ERC8183_ESCROW_ADDRESS,
    },
    erc8004: {
      registryAddress:
        env.ALTANA_CHAIN === 'bnb-testnet'
          ? (env.ERC8004_REGISTRY_ADDRESS_TESTNET ??
            env.ERC8004_REGISTRY_ADDRESS)
          : env.ERC8004_REGISTRY_ADDRESS,
      swapMasterOnchainAgentId: env.SWAPMASTER_ONCHAIN_AGENT_ID ?? '1',
    },
    ai: {
      provider: env.AI_PROVIDER,
      embeddingProvider: env.AI_EMBEDDING_PROVIDER,
      plannerModel: env.PLANNER_MODEL,
      embeddingModel: env.EMBEDDING_MODEL,
      geminiApiKey: env.GEMINI_API_KEY,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
    },
  }) satisfies Record<string, Record<string, unknown>>;

export type RillConfig = ReturnType<typeof buildConfig>;

/**
 * Inject this rather than the bare `ConfigService`, so `get('database.url')` is checked against
 * the namespaces above and cannot come back `undefined`.
 */
export type RillConfigService = ConfigService<RillConfig, true>;
