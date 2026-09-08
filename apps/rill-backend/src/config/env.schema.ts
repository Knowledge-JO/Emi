import { z } from 'zod';

/**
 * Every environment variable the backend requires, validated once at boot. A misconfigured
 * deployment has to fail here — the alternative is discovering a missing escrow address halfway
 * through a workflow that has already spent a user's money.
 */

const evmAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'expected a 0x-prefixed EVM address')
  // Addresses are compared byte-for-byte against on-chain allowlists, so normalise on the way in.
  .transform((value) => value.toLowerCase());

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // 4000 rather than 3000: the Next.js app owns 3000, and `turbo run dev` starts both.
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log'),
  /** Browser origins allowed to call the API, comma-separated. */
  WEB_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  DATABASE_SSL: flag,

  REDIS_URL: z.url(),

  TEMPORAL_ADDRESS: z.string().min(1).default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),
  TEMPORAL_TASK_QUEUE: z.string().min(1).default('rill'),

  BSC_RPC_URL: z.url(),
  BSC_CHAIN_ID: z.coerce.number().int().positive().default(56),
  /**
   * Which Altana network wallets live on. `bnb-testnet` (chain 97) is the only full-stack
   * testnet — keystore, account stack and relay all run there. Base is deliberately absent:
   * Altana deploys only the keystore cache there, so no wallet can execute against it.
   */
  ALTANA_CHAIN: z.enum(['bnb', 'bnb-testnet', 'ethereum']).default('bnb'),
  /** Where session private keys are read from. Never the database. */
  SESSION_SECRET_PROVIDER: z
    .enum(['env', 'file', 'vault', 'aws_secrets_manager', 'gcp_secret_manager'])
    .default('file'),
  /** Directory for per-session keys when SESSION_SECRET_PROVIDER=file. Gitignored. */
  SESSION_SECRET_DIR: z.string().min(1).default('.secrets/sessions'),
  /** Override if the configured chain's Keystore is not the well-known mainnet address. */
  ALTANA_KEYSTORE_ADDRESS: evmAddress.optional(),

  /** Privy is the identity provider for human callers. Agents authenticate with API keys. */
  PRIVY_APP_ID: z.string().min(1),
  /**
   * The app's ES256 public key, copied from Privy's dashboard. Present so access tokens are
   * verified in-process on every request: no network hop on the hot path, and no app secret in
   * the API's environment for something that only needs a public key.
   */
  PRIVY_VERIFICATION_KEY: z
    .string()
    .min(1)
    // Multi-line PEMs are usually pasted into env files with escaped newlines.
    .transform((value) => value.replace(/\\n/g, '\n')),

  X402_FACILITATOR_URL: z.url(),
  /** The address agents pay when Rill itself is the x402 merchant. */
  X402_MERCHANT_ADDRESS: evmAddress,

  ERC8183_ESCROW_ADDRESS: evmAddress,
  ERC8004_REGISTRY_ADDRESS: evmAddress,
  ERC8183_ESCROW_ADDRESS_TESTNET: evmAddress.optional(),
  ERC8004_REGISTRY_ADDRESS_TESTNET: evmAddress.optional(),
  /**
   * On-chain ERC-8004 token id for the seeded SwapMaster listing. Unset keeps the placeholder
   * `"1"` — do not treat that as our NFT until a live read names SwapMaster.
   */
  SWAPMASTER_ONCHAIN_AGENT_ID: z
    .string()
    .regex(/^\d+$/, 'expected a decimal ERC-8004 agent id')
    .optional(),

  /**
   * Which vendor serves chat / structured extraction. Each has its own SDK: Gemini uses
   * `@google/genai`, OpenAI `openai`, Anthropic `@anthropic-ai/sdk`. Switching is this value
   * plus the matching API key and model name — parsers never import a vendor package.
   */
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  /** Anthropic has no embedding model; discovery embeddings are Gemini or OpenAI. */
  AI_EMBEDDING_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  PLANNER_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  EMBEDDING_MODEL: z.string().min(1).default('gemini-embedding-001'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Throws with every problem at once, so a fresh deployment is fixed in one pass. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const env = result.data;
  const missing: string[] = [];

  if (env.AI_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY (AI_PROVIDER=gemini)');
  }
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY (AI_PROVIDER=openai)');
  }
  if (env.AI_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    missing.push('ANTHROPIC_API_KEY (AI_PROVIDER=anthropic)');
  }
  if (env.AI_EMBEDDING_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY (AI_EMBEDDING_PROVIDER=gemini)');
  }
  if (env.AI_EMBEDDING_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY (AI_EMBEDDING_PROVIDER=openai)');
  }

  if (missing.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${missing.map((name) => `  ${name}: required`).join('\n')}`,
    );
  }

  return env;
}
