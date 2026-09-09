# rill-backend

The NestJS API and orchestrator behind [Rill](../../README.md). It turns a user's stated outcome
into a planned workflow, hires agents to carry it out, and executes the result on BNB Chain under
bounded, revocable authority.

Architecture: **[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)**.

## Pipeline

```text
intent → planner → capability graph → agent discovery → ranking → workflow builder
       → authorization plan → execution → BNB Chain
```

Planning and execution are separate calls. Nothing runs until the user has approved the scope of
authority being granted.

## Module map

```text
src/
├── config/            env schema + typed config
├── common/            guards, filters, interceptors, error taxonomy
├── database/          Drizzle client, schema, migrations
└── modules/
    ├── users/         accounts
    ├── auth/          humans (passkey/session) and agents (API keys)
    ├── wallet/        Altana smart accounts, session keys, permissions, balances
    ├── intent/        free text → goal tree → capability graph
    ├── marketplace/   registry, discovery, capabilities, pricing, ranking, reputation
    ├── identity/      ERC-8004 agent identity
    ├── orchestrator/  planner, agent selection, workflow builder, authorization planner, router
    ├── agents/        skills registry + adapters (swap, loan, risk, liquidity, token, research)
    ├── commerce/
    │   ├── x402/      pay for capabilities, and charge for ours as a merchant
    │   └── erc8183/   job escrow: create, fund, deliver, settle, dispute
    ├── execution/     protocol adapters (PancakeSwap, Aave, token factory, LP)
    ├── blockchain/    viem clients, Keystore reads, indexer, tx tracking
    ├── workflows/     Temporal workflows + BullMQ queues
    └── events/        event store, outbox, audit trail
```

## Rules this codebase enforces

These are load-bearing. Breaking one is how the platform becomes unsafe rather than merely buggy.

1. **Only `wallet` touches Altana.** No other module constructs a signer or a `Session`.
2. **Only `execution` builds calldata.** The orchestrator emits intent-level steps, never raw calls.
3. **The planner LLM has no keys, no wallet and no chain access.** It returns a schema-validated
   plan. The authorization planner converts that plan into a scoped session the user approves.
4. **`commerce/x402` and `commerce/erc8183` never share a code path**, a settlement flow or a table.
   Never open an escrow job for a single API request.
5. **Every state transition emits an event** into `events`, so any run is auditable and replayable.
6. **Never widen a session's scope to make a step succeed.** The session is the enforcement
   boundary between what the model suggested and what the chain permits.

Dependency direction is one-way, and lower layers never import upper ones:

```text
intent → marketplace → orchestrator → commerce → execution → wallet → chain
```

## Altana session handling

The sharp edges, all of which are recorded as TODOs at the relevant call sites:

- Persist a session with `serializeSession` (JSON-safe, no secret) and keep the session private key
  in a secret store. **Never `JSON.stringify` a `Session`** — it throws on bigint limits and embeds
  the private key. Restore with `deserializeSession(stored, signerFromPrivateKey(key))`.
- At execute time, `permissions + expiry + publicKey` must match the on-chain grant exactly. A lossy
  round trip (bigint → number, re-cased hex) breaks validation.
- Omitting `permissions.calls` means **unrestricted contract access**. Always set both `calls` and
  `spend`.
- The wallet must hold native tokens before its first `execute`; that first admin-signed action
  auto-prepends the Keystore `initialRegisterKey`. Don't pre-call it.
- `execute` rejects an empty `calls` array.
- Verify authority on-chain with `isValidKey(user, keyId)`, which answers *exists AND not revoked
  AND not expired* in one call. `getKeys(user)` drops revoked keys but **not expired ones** — expiry
  is a passive timestamp, so check each id with `isValidKey` before trusting it.
  `GET /chain/keystore/:user/:keyId` is the public read of that view.
- Long-running workflows outlive short sessions: re-check validity before each execute.

## Setup

```sh
npm install
```

Copy the environment variables below into `.env`:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis, for BullMQ |
| `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE` | Temporal server for durable workflows |
| `BSC_RPC_URL` | BNB Chain RPC endpoint |
| `AGENT_PRIVATE_KEY` | Signer for platform-operated agent wallets. Stays in this process; Altana never sees it |
| `X402_FACILITATOR_URL` | x402 facilitator (`https://x402.dexter.cash` on BNB) |
| `X402_MERCHANT_ADDRESS` | Altana smart account that receives inbound capability payments |
| `ERC8183_ESCROW_ADDRESS` | Job escrow contract |
| `ERC8004_REGISTRY_ADDRESS` | Agent identity registry |
| `GEMINI_API_KEY`, `AI_PROVIDER`, `PLANNER_MODEL` | Chat model (Gemini via `@google/genai` by default) |
| `AI_EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` | Discovery embeddings (1536 dimensions) |

Local services:

```sh
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17
docker run -d -p 6379:6379 redis:7
temporal server start-dev   # optional; API records a handle even when Temporal is down
# Worker (separate process) listens on TEMPORAL_TASK_QUEUE=rill for loanProtection
```

PostgreSQL must have `pgvector` enabled before any vector column is created — semantic agent
discovery depends on it.

## Commands

```sh
npm run start:dev      # watch mode
npm run start:prod     # node dist/main
npm run build
npm run lint
npm run test
npm run test:e2e
npm run x402:provision-merchant   # Altana payTo + X402_FACILITATOR_URL in .env
```

Database, via drizzle-kit:

```sh
npm run db:generate    # generate SQL from src/database/schema
npm run db:migrate     # apply migrations
npm run db:push        # push schema directly (local only)
npm run db:studio      # browse data
```

## Stack

NestJS 11 · Drizzle ORM + PostgreSQL/pgvector · Redis + BullMQ · Temporal · viem ·
`@altananetwork/sdk` · x402 · Vercel AI SDK

Nest add-ons are pinned to the v11 line to match `@nestjs/core`. The v12 ecosystem is available but
requires upgrading core first.

## Status

Scaffolding only. Every file carries a TODO describing what belongs in it; no application logic is
implemented. `npm run build` compiles and the app boots with all modules registered.
