# Rill — Agent Marketplace Architecture

> **A user describes an outcome. The marketplace finds the best agents. Agents can hire other agents
> through ERC-8183 or purchase machine capabilities through x402. Altana gives every agent bounded,
> temporary, revocable authority to act. The resulting workflow executes real economic activity on
> BNB Chain.**

Rill is not `Marketplace → Agent → Blockchain`. It is:

```text
User → Intent → Agent Economy → Agent-to-Agent Commerce → Permissioned Execution → BNB Chain
```

---

## 1. System architecture

```text
                              USER
                                │
                                ▼
                    ┌─────────────────────┐
                    │      WEB APP        │
                    │     Next.js         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      API/BFF        │
                    │      NestJS         │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
       ┌───────────┐    ┌──────────────┐   ┌─────────────┐
       │  INTENT   │    │ MARKETPLACE  │   │   WALLET    │
       │  ENGINE   │    │   ENGINE     │   │   SERVICE   │
       └─────┬─────┘    └──────┬───────┘   └──────┬──────┘
             │                 │                  │
             └─────────────────┼──────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  AGENT ORCHESTRATOR │
                    │                     │
                    │ Planner             │
                    │ Agent Selection     │
                    │ Workflow Engine     │
                    │ Agent Router        │
                    └──────────┬──────────┘
                               │
                   ┌───────────┴────────────┐
                   │                        │
                   ▼                        ▼
          ┌──────────────────┐      ┌──────────────────┐
          │ AGENT COMMERCE   │      │ DIRECT EXECUTION │
          │                  │      │                  │
          │ ERC-8183         │      │ Altana Session   │
          │ Agent → Agent    │      │ Agent → Chain    │
          └────────┬─────────┘      └────────┬─────────┘
                   │                         │
                   ▼                         ▼
          ┌─────────────────────────────────────────┐
          │             AGENT NETWORK               │
          │                                         │
          │ Swap Agent     Loan Agent               │
          │ LP Agent       Research Agent           │
          │ Token Agent    Risk Agent               │
          └───────────────────┬─────────────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
                     ▼                 ▼
              ┌────────────┐    ┌──────────────┐
              │   x402     │    │ ERC-8183     │
              │ HTTP/API   │    │ Job Escrow   │
              │ payments   │    │ payments     │
              └─────┬──────┘    └──────┬───────┘
                    │                  │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ ALTANA WALLET    │
                    │                  │
                    │ Smart Account    │
                    │ Session Keys     │
                    │ Spend Limits     │
                    │ Expiry           │
                    │ Revocation       │
                    └────────┬─────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │  EXECUTION    │
                     │    LAYER      │
                     └───────┬───────┘
                             │
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
         PancakeSwap       Aave         BNB Chain
```

---

## 2. The three protocols have different jobs

Altana, x402 and ERC-8183 are **not** competing technologies. Each answers a different question.

| Protocol        | Question it answers                               | Role                 |
| --------------- | ------------------------------------------------- | -------------------- |
| **Altana**      | "What is this agent allowed to do?"               | Authority layer      |
| **x402 / B402** | "How does an agent pay for a capability/API?"     | Micro-payment rail   |
| **ERC-8183**    | "How does an agent hire another agent for a job?" | Job escrow           |
| **ERC-8004**    | "Who is this agent?"                              | Identity / discovery |

### Altana — authority

Non-custodial smart account with an on-chain registry of authorized session keys. The admin key
signs once to grant a scoped session; the session signs every action after. Revocation is one tx,
effective immediately.

Provides: smart account, session keys, on-chain permissions, spend limits, contract allowlists,
expiry, revocation. The private key stays wherever our code runs — Altana never sees it.

### x402 / B402 — pay per capability

```text
Research Agent ──HTTP──▶ Price API ──402──▶ Research Agent ──x402 payment──▶ API ──▶ Result
```

Per-request commerce. Perfect for "pay 0.02 $U for this quote", "pay 0.05 $U for this risk
analysis". The Altana SDK exposes `fetchWithX402` so a session key can pay for HTTP resources
directly.

### ERC-8183 — hire an agent

```text
User Agent ──hire──▶ Risk Agent ──performs job──▶ Deliverable ──▶ Escrow released
```

Meaningful jobs with deliverables, not tiny API calls.

**Rule of thumb:** small, fast, machine-to-machine capability → **x402**. Meaningful job with a
deliverable → **ERC-8183**. Never create an escrow job for a single API request.

---

## 3. Rill is an agent economy, not an agent store

```text
USER
 │ "Protect my loan"
 ▼
RILL
 │ discovers
 ▼
Loan Protection Agent
 │ needs
 ├───────────────┐
 ▼               ▼
Risk Agent     Swap Agent
 │ x402         │ ERC-8183
 ▼               ▼
Risk data       Swap execution
 │               │
 └───────┬───────┘
         ▼
    Loan Agent
         │
         ▼
       Aave
```

Agents don't need to contain every capability themselves. They become **economic actors** that can
buy capabilities and hire peers.

### Two commerce directions

```text
Users hire agents:     User   → Marketplace → Agent
Agents hire agents:    Agent A → Marketplace → Agent B
```

---

## 4. Marketplace architecture

```text
Marketplace
│
├── Agent Registry
├── Agent Discovery
├── Capability Registry
├── Agent Reputation
├── Agent Pricing
├── Agent Ranking
├── Agent Availability
├── Agent Identity
└── Agent Commerce
```

The central object is the **Capability**, not the agent. An agent must not just claim "I am a DeFi
agent" — it declares machine-matchable capabilities:

```json
{
  "agent": "SwapMaster",
  "capabilities": [
    {
      "name": "swap",
      "assets": ["BNB", "USDT", "USDC"],
      "protocols": ["PancakeSwap"],
      "pricing": { "model": "per_job" }
    }
  ]
}
```

---

## 5. Intent → capability graph

The parser produces legs, not agents. Each leg becomes a capability-graph node the marketplace
can resolve independently:

```text
"swap 5 usdt for bnb"
        │
        ▼
ParsedIntent.legs[0]     taxonomyKey: defi.swap
                         from: USDT "5" → to: BNB
        │
        ▼
capability graph         { id: "leg-0", taxonomyKey: "defi.swap",
                           input: { fromSymbol: "USDT", toSymbol: "BNB",
                                    amount: "5", chain: "bnb" } }
        │
        ▼
marketplace              exact defi.swap + USDT + BNB + chain 56
        │
        ▼
recommendations          SwapMaster, rank 1, score breakdown stored
```

A richer goal still follows the same mapping. User says _"Protect my BNB loan."_ The Intent
Engine produces a goal tree:

```text
Goal
└── Protect Loan
      ├── Monitor position
      ├── Calculate health factor
      ├── Obtain repayment asset
      └── Repay
```

The marketplace then resolves an agent for each node:

```text
                  Protect Loan
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Monitor          Risk          Repayment
       Agent          Agent           Agent
                                      │
                                      ▼
                                  Swap Agent
```

That resolved graph becomes the **workflow**.

---

## 6. Agent Orchestrator

The brain of the backend.

```text
Intent → Planner LLM → Capability Graph → Agent Discovery → Agent Ranking
       → Workflow Builder → Authorization Plan → Execution
```

**The LLM plans; it never holds wallet access.** The output workflow must be deterministic and
enforceable. Authority comes from the Altana authorization plan, not from model output.

---

## 7. Where ERC-8183 enters

Discovered agents: `Loan Guardian`, `Risk Oracle`, `SwapMaster`, `RepayBot`.

```text
Loan Guardian ──ERC-8183──▶ Risk Oracle ──deliverable──▶ Loan Guardian
Loan Guardian ──ERC-8183──▶ SwapMaster
Loan Guardian ─────────────▶ Aave
```

---

## 8. x402 as the micro-payment rail

```text
Risk Agent API → 402 Payment Required → Altana session → x402 payment → Risk result
```

Example: `GET /risk/aave-position` charging `0.01 $U`.

---

## 9. Altana sits underneath both rails

```text
                 Altana Wallet
                      │
            ┌─────────┴─────────┐
            │                   │
        x402 spending       ERC-8183
            │                   │
       API payments          job escrow
            │                   │
            └─────────┬─────────┘
                      │
                 Agent actions
```

A session is a bounded budget:

```text
Agent Session
────────────────────────
Duration:       24 hours

Spend:
  $U:            $50

Allowed:
  PancakeSwap
  Aave
  ERC-8183 commerce

Denied:
  arbitrary contracts

Status:
  ACTIVE
```

Session authorization, expiry and revocation are all recorded on-chain in the Altana Keystore, and
are verifiable by any third party via `isValidKey(user, keyId)`.

---

## 10. Wallet Service

A dedicated module.

```text
Wallet Service
│
├── Create smart account
├── Passkey onboarding
├── Session creation
├── Permission generation
├── Spend-limit generation
├── Session persistence
├── Session restoration
├── Session revocation
├── Wallet balances
└── Signature verification
```

Constraints:

- The private key must **never pass through the backend unnecessarily**. Custody follows the signer
  the integrator brings.
- Browser users onboard via **passkey wallets** (`createPasskeyWallet` / `recoverFromPasskey`).
- Persist sessions with `serializeSession` (JSON-safe, no secret) plus the session key in a secret
  store. Never `JSON.stringify` a `Session` — it throws on bigint limits and embeds the private key.
- On execute, `permissions + expiry + publicKey` must match the on-chain grant exactly. A lossy
  round trip (bigint → number, re-cased hex) breaks validation.
- Omitting `permissions.calls` means **unrestricted contract access**. Always set both `calls` and
  `spend`.

---

## 11. Agent wallets vs user wallets

```text
User  → Altana Smart Account
Agent → Altana Smart Account → Session Key
```

A user's wallet grants a scoped session to an agent:

```text
User Wallet
      │ grants
      ▼
Loan Guardian Session
      ├── Aave
      ├── PancakeSwap
      ├── max $50
      └── expires 24h
```

The agent never becomes the owner of user funds.

---

## 12. ERC-8004 — identity and discovery

```text
Agent
 ├── Identity
 ├── Capabilities
 ├── Reputation
 ├── Endpoint
 ├── Developer
 └── Commerce history
```

```text
ERC-8004 → Agent identity → Marketplace → ERC-8183 / x402
```

Identity feeds commerce.

---

## 13. Data architecture

PostgreSQL + Drizzle, with `pgvector` for semantic agent discovery. Twenty-seven tables in seven
groups, one schema file per group under `apps/rill-backend/src/database/schema`.

### 13.1 Five rules the schema enforces

1. **Identity is not authority.** No row in `users`, `agents` or `wallets` can move money. Every
   spend traces to a `sessions` row, and every session traces to an on-chain grant in
   `authorizations`.
2. **On-chain values are stored exactly.** Amounts are `numeric(78,0)` read as decimal strings;
   addresses are lower-cased `char(42)`; hashes are `char(66)`. Altana matches
   `permissions + expiry + publicKey` against the authorization committed at grant time, so a
   limit that passes through a float, or an address that comes back re-cased, produces a session
   that can no longer act.
3. **The two rails never share a table.** `jobs` is ERC-8183 escrow; `x402_payments` is the
   per-request ledger. Different settlement, different lifecycle, no shared code path.
4. **Reputation is derived, never written.** `reputation` rows are recomputed from `events` up to
   a recorded sequence watermark, so a score can be reproduced and cannot be bought.
5. **The chain is the source of truth.** Tables that mirror on-chain state — `agent_identities`,
   `authorizations`, `transactions` — carry the block or timestamp they were read at. Discovery
   may serve a stale cache; commerce re-reads the chain.

### 13.2 Table map

```text
PostgreSQL
│
├── identity
│   ├── users                  platform accounts, auth identifiers only
│   ├── api_keys               API credentials (digest only) for users and agents
│   ├── developers             agent publishers, payout address, verification
│   └── wallets                Altana smart accounts, for users and agents alike
│
├── catalog
│   ├── assets                 BNB, USDT, USDC, $U — address, decimals, chain
│   ├── protocols              PancakeSwap, Aave, token factory, LP
│   ├── protocol_contracts     addresses per chain and role; the allowlist source
│   ├── agents                 marketplace listings + description embedding
│   ├── agent_identities       ERC-8004 records, with last synced block
│   ├── capabilities           machine-matchable declarations + embedding
│   ├── capability_assets      which assets a capability covers
│   └── capability_protocols   which protocols a capability touches
│
├── planning
│   ├── intents                raw goal, goal tree, capability graph, budget
│   ├── recommendations        ranked matches with a per-component score breakdown
│   ├── workflows              resolved graph + authorization plan + Temporal handle
│   └── workflow_steps         one node per step: agent, capability, rail, deps
│
├── authority
│   ├── sessions               serialized Altana sessions, secret store reference
│   ├── permissions            one row per call allowlist entry or spend cap
│   └── authorizations         on-chain grant receipts, fees, revocations
│
├── commerce
│   ├── jobs                   ERC-8183 escrow jobs
│   ├── job_deliverables       versioned outputs, acceptance, release tx
│   ├── x402_payments          micro-payment ledger, outbound and inbound
│   └── transactions           every tx/userOp the platform originated
│
├── trust
│   └── reputation             derived scores, one row per agent per window
│
└── audit
    ├── events                 append-only event store, totally ordered by `seq`
    ├── event_outbox           transactional delivery of those events
    └── indexer_cursors        last finalized block per chain + feed
```

Four tables are additions to the original sketch, each forced by a rule above:
`protocol_contracts` (rule 1 — an address that is not a known protocol contract can never reach a
session allowlist), `capability_assets` and `capability_protocols` (discovery has to filter in SQL,
not in application code), and `event_outbox` (rule 4 — a derived score is only reproducible if
event delivery is transactional). `api_keys` backs the existing API-key guard. `indexer_cursors`
is the restart cursor for §34 — not a production indexer service.

### 13.3 The authority chain

```text
users ──▶ wallets ──▶ sessions ──▶ permissions
                         │              (call rows + spend rows)
                         │
                         ├──▶ authorizations   grant tx, fee, expiry, revocation
                         │
                         └──▶ transactions     what the session actually did
```

`sessions` holds the output of `serializeSession` and a _reference_ to the secret store. The
private key is never in Postgres. Rebuilding a usable session is deliberately a two-source
operation: `deserializeSession(row.serialized, signerFromPrivateKey(secret))`.

An empty allowlist is not "no access" — omitting `permissions.calls` grants a session _every_
contract inside its spend cap. So the wallet module must refuse to grant a session with no `call`
rows, and `permissions` records call and spend entries in one table precisely so neither can be
forgotten.

### 13.4 The commerce split

The capability decides the rail, and the rail decides the table:

```text
capabilities.pricing_model   capabilities.settlement_rail   artifact
─────────────────────────────────────────────────────────────────────────
per_request              ──▶ x402                      ──▶ x402_payments
per_job                  ──▶ erc8183                   ──▶ jobs
                                                            └── job_deliverables
```

That mapping is a check constraint, not a convention: the database rejects an escrow job priced
per request. Both paths converge only in `transactions`, which records the on-chain effect, and in
`events`, which records the history.

### 13.5 Intent to execution

```text
intents ──▶ recommendations ──▶ workflows ──▶ workflow_steps
   │             (ranked)         (bound)            │
   │                                                 ├──▶ jobs ──▶ job_deliverables
   │                                                 ├──▶ x402_payments
   │                                                 └──▶ transactions
   └── goal_tree + capability_graph (planner output, no authority)
```

The planner writes `intents` (raw text, parsed object, capability graph). The marketplace writes
`recommendations`. Neither writes workflows or sessions — those are later, after a human picks a
match and grants a session.

### 13.6 Discovery

`agents.description_embedding` and `capabilities.embedding` are `vector(1536)` columns with HNSW
cosine indexes. Matching a goal node runs exact first, vector second: `capabilities.taxonomy_key`
for a declared match (`defi.swap`, `defi.lending.repay`), then nearest-neighbour on the embedding
for anything the taxonomy misses. Asset and protocol filters are joins, so a semantic match that
cannot handle USDT on BNB Chain never reaches the ranker.

### 13.7 Invariants enforced by the database

| Constraint                                | What it prevents                                       |
| ----------------------------------------- | ------------------------------------------------------ |
| `capabilities_rail_matches_pricing`       | an escrow job created for a single API request         |
| `workflow_steps_rail_matches_kind`        | a step that hires an agent but settles over x402       |
| `workflow_steps_paid_step_needs_agent`    | paying for a step with no agent to pay                 |
| `x402_payments_outbound_needs_session`    | the platform spending without a granted session        |
| `permissions_call_shape` / `_spend_shape` | a scope row that is neither a call nor a cap           |
| `wallets_owner_matches_kind`              | a wallet owned by both a user and an agent, or neither |
| `jobs_hirer_matches_kind`                 | an escrow job with an ambiguous hirer                  |
| `jobs_no_self_hire`                       | an agent inflating its own job count                   |
| `*_lowercase` (addresses)                 | a re-cased address breaking an on-chain match          |
| `assets_decimals_range`                   | a decimals value that silently rescales every limit    |

### 13.8 Migrations

```text
0000_enable_pgvector       CREATE EXTENSION vector
0001_init                  enums, 26 tables, indexes, constraints
0002_add_privy_auth_provider   auth_provider += 'privy'
0003_workflows_wallet_id_optional  draft plans may exist before a wallet
0004_indexer_cursors       persisted block cursor per chain + feed
```

Order is load-bearing: the extension must exist before the first `vector` column or HNSW index, so
migrations are always applied in sequence on a fresh database — never `db:push` against one.

---

## 14. Queues and workflow engine

```text
Redis → BullMQ      short-lived jobs
Temporal            durable, long-running workflows
```

BullMQ handles fire-and-forget work. Anything like _"Monitor my loan for 7 days and act when health
factor < 1.3"_ is a **durable workflow** and belongs in Temporal:

```text
START → Monitor → Wait → Check
                            ├── HF > 1.3 ──▶ WAIT
                            └── HF < 1.3 ──▶ Execute → Verify → COMPLETE
```

---

## 15. Rill as an x402 merchant

The platform monetizes its own capabilities: `/quote`, `/risk-analysis`, `/pool-analysis`,
`/portfolio-analysis`.

```text
Agent ──HTTP──▶ Rill API ──▶ x402 Guard
                              ├── Payment valid?
                              ├── Amount valid?
                              └── Settlement valid?
                              ▼
                        Execute capability ──▶ Return result
```

x402 (HTTP payment) and ERC-8183 (job escrow) are modelled as **separate flows**, never merged.

---

## 16. Final production architecture

```text
                              ┌──────────────┐
                              │     USER     │
                              └──────┬───────┘
                                     │
                                     ▼
                         ┌──────────────────────┐
                         │      NEXT.JS         │
                         │ Marketplace / Wallet │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       NESTJS         │
                         │      API/BFF         │
                         └──────────┬───────────┘
                                    │
       ┌────────────────────────────┼──────────────────────────┐
       │                            │                          │
       ▼                            ▼                          ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│ Intent       │            │ Marketplace  │            │ Wallet       │
│ Engine       │            │ Engine       │            │ Service      │
└──────┬───────┘            └──────┬───────┘            └──────┬───────┘
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │    ORCHESTRATOR     │
                         │                     │
                         │ Planner             │
                         │ Agent Ranking       │
                         │ Workflow Engine     │
                         │ Agent Router        │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          ┌──────────────────┐              ┌──────────────────┐
          │ AGENT COMMERCE   │              │ DIRECT EXECUTION │
          │                  │              │                  │
          │ ERC-8183         │              │ Altana Session   │
          │ Job Escrow       │              │ → Protocol       │
          └────────┬─────────┘              └────────┬─────────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   AGENT NETWORK     │
                         │                     │
                         │ Swap                │
                         │ Loan                │
                         │ Risk                │
                         │ Liquidity           │
                         │ Token               │
                         │ Research            │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌──────────────┐     ┌──────────────┐
                  │     x402     │     │  ERC-8183    │
                  │ Micro-pay    │     │ Job escrow   │
                  └──────┬───────┘     └──────┬───────┘
                         │                    │
                         └──────────┬─────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   ALTANA WALLET     │
                         │                     │
                         │ Smart Account       │
                         │ Session Keys        │
                         │ Spend Limits        │
                         │ Contract Allowlist  │
                         │ Expiry              │
                         │ Revocation          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ EXECUTION ADAPTERS  │
                         │                     │
                         │ PancakeSwap         │
                         │ Aave                │
                         │ Token Factory       │
                         │ LP                  │
                         │ Other BSC protocols │
                         └──────────┬──────────┘
                                    │
                                    ▼
                              BNB CHAIN


       ┌─────────────────────────────────────────────────┐
       │                    DATA LAYER                   │
       │                                                 │
       │ PostgreSQL + Drizzle + pgvector                 │
       │ Redis + BullMQ                                  │
       │ Temporal                                        │
       │ Blockchain Indexer                              │
       │ Event Store                                     │
       └─────────────────────────────────────────────────┘
```

---

## 17. The key architectural insight

```text
                    ┌─────────────┐
                    │   INTENT    │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │ MARKETPLACE │
                    └──────┬──────┘
                           │
                    Find / Rank / Compose
                           ▼
                    ┌─────────────┐
                    │   AGENTS    │
                    └──────┬──────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
          x402                       ERC-8183
       "buy capability"             "hire agent"
             │                           │
             └─────────────┬─────────────┘
                           ▼
                    ┌─────────────┐
                    │   ALTANA    │
                    │  AUTHORITY  │
                    └──────┬──────┘
                           │
                  "what may I do?"
                           ▼
                    ┌─────────────┐
                    │  EXECUTION  │
                    └──────┬──────┘
                           ▼
                       BNB CHAIN
```

---

## 18. Backend module map

How the architecture maps onto `apps/rill-backend/src`:

```text
src/
├── main.ts
├── app.module.ts
├── config/                       env schema + typed config
├── common/                       guards, filters, interceptors, pagination, errors
├── database/                     Drizzle client + schema + migrations
│   ├── schema/                   one file per table group
│   ├── seed/                     catalog + SwapMaster (data, not a migration)
│   └── migrations/               applied in sequence; pgvector first
│
└── modules/
    ├── users/                    accounts, profiles
    ├── auth/                     Privy token verification, API keys, agent auth
    ├── ai/                       LanguageModel + EmbeddingModel ports (Gemini/OpenAI/Anthropic)
    ├── wallet/                   Altana smart accounts, session keys, permissions
    ├── intent/                   intent capture → goal tree → capability graph
    ├── marketplace/              registry, discovery, capabilities, pricing, ranking,
    │                             reputation, availability
    ├── identity/                 ERC-8004 agent identity + attestations
    ├── orchestrator/             planner, agent selection, workflow builder,
    │                             authorization planner, agent router
    ├── agents/                   skills registry + adapters (swap, loan, risk,
    │                             liquidity, token, research)
    ├── commerce/
    │   ├── x402/                 client (pay) + merchant guard (get paid)
    │   └── erc8183/              job escrow: create, fund, deliver, settle, dispute
    ├── execution/                protocol adapters (PancakeSwap, Aave, token factory, LP)
    ├── blockchain/               chain clients, indexer, event listeners
    ├── workflows/                Temporal workflows + activities, BullMQ queues
    └── events/                   event store, outbox, audit trail
```

### Boundary rules

1. **Only** `wallet` **talks to Altana.** No other module constructs a signer or a session.
2. **Only** `execution` **builds calldata.** Orchestrator produces intent-level steps, never raw calls.
3. **The planner LLM has no wallet, no keys, no direct chain access.** It returns a plan; the
   authorization planner turns that plan into a scoped session grant a human approves.
4. `commerce/x402` **and** `commerce/erc8183` **never share a code path.** Different rails, different
   settlement, different tables.
5. **Every state transition emits an event** into `events` for audit and replay.
6. **Amounts and addresses cross module boundaries as exact strings.** A `bigint` converted for
   convenience is a session that fails on-chain validation later, far from the conversion.
7. **Nothing writes** `reputation` **by hand.** It is a projection of `events`; the only writer is
   the job that recomputes it.
8. **A platform token never authorizes an on-chain action.** Authenticating a caller and granting
   authority are separate steps with separate credentials — see §19.

---

## 19. Authentication

Privy is the identity provider for humans. It answers _"who is calling the API"_ and nothing more:
it holds no funds, signs no transactions, and grants no authority. Authority to act on-chain comes
from an Altana session grant (§9, §10), which a user approves separately and which the chain
itself enforces.

```text
browser                              rill-backend
───────                              ────────────
Privy login (email, OAuth,
wallet, passkey)
   │
   └─▶ access token (ES256 JWT) ──▶  PrivyAuthGuard
                                     verifies signature, audience, expiry
                                     in-process against the app's public key
                                            │
                                            ▼
                                     DID ──▶ users row (created on first sign-in)
                                            │
                                            ▼
                                     user.created / user.signed_in → events
```

### 19.1 What the backend stores

A user row holds the Privy DID in `external_auth_id` with `auth_provider = 'privy'`, and nothing
else that Privy already owns. Which login method the user chose, and which accounts they later
link or unlink, is Privy's state — caching it here would only create a second version of the truth
that goes stale. Email is copied opportunistically because it is useful for support and notices,
never as a credential.

### 19.2 Verification is offline

The API holds the app's **public** verification key, so every authenticated request is verified in
process: no network hop on the hot path, and no Privy app secret in the API's environment for
something that needs only a public key. `PRIVY_APP_ID` and `PRIVY_VERIFICATION_KEY` are both
required at boot — a deployment that cannot verify tokens must not start.

Where the token arrives depends on Privy's session mode, so the guard reads both: an
`Authorization: Bearer` header (local-storage sessions, the default) and a `privy-token` cookie
(HttpOnly sessions). Switching that dashboard setting does not silently log everyone out.

If the client also sends an **identity token** (`privy-id-token`), the backend verifies it against
the same key to read linked accounts. That is best-effort by design: a missing or invalid identity
token costs the user an email address on their profile, not their sign-in.

### 19.3 Endpoints

| Route                  | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `POST /auth/session`   | Completes sign-in; creates the account on first call. Idempotent.                     |
| `DELETE /auth/session` | Records the sign-out. Privy owns the session; there is nothing on our side to revoke. |
| `GET /users/me`        | The account behind the calling token.                                                 |

The handshake is explicit rather than implicit on first read, so account creation is an action with
an event behind it instead of a side effect of an arbitrary `GET`.

### 19.4 Two credentials, two questions

| Credential         | Answers                      | Issued by | Enforced by      |
| ------------------ | ---------------------------- | --------- | ---------------- |
| Privy access token | Who is calling the API?      | Privy     | `PrivyAuthGuard` |
| Altana session key | What may be signed on-chain? | User      | The chain        |

Agents are the other caller class and authenticate differently — an API key resolved to an
ERC-8004 identity, so x402 charges and reputation land on the right actor. See §27.

---

## 20. Intent extraction

A user message is not a plan and not a transaction. The first job is to turn it into a **standard
object** the rest of the system can refuse, replay, or match.

```text
"swap 5 usdt for bnb"
        │
        ▼
LanguageModel.generateJson   ← Gemini (@google/genai) today;
        │                       OpenAI or Anthropic by flipping AI_PROVIDER
        ▼
Zod parsedIntentSchema       ← the model output is untrusted until this passes
        │
        ▼
{
  kind: "swap",
  chain: "bnb",
  legs: [{
    type: "swap",
    taxonomyKey: "defi.swap",
    from: { symbol: "USDT", amount: "5" },
    to:   { symbol: "BNB",  amount: null }
  }],
  goalTree: { … },
  missing: ["slippage tolerance", "which wallet pays"],
  assumptions: ["Amount 5 is USDT, not BNB"]
}
```

Amounts stay decimal strings. The parser does not pick an agent, a router, or a wallet. An
unparseable message is a 422, not a guessed swap. Matching happens _after_ this object exists:
each `legs[]` entry becomes a capability-graph node, and the marketplace ranks listings against
those nodes (see §21).

Chat and embeddings are separate ports (`LanguageModel`, `EmbeddingModel`) so the planner and
discovery can use Gemini, OpenAI, or Anthropic independently. Anthropic has no embedding model.
Both embedding providers emit 1536 dimensions, matching the `vector` columns.

| Route                           | Purpose                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `POST /intents`                 | Parse a message, build the capability graph, match agents, persist all three |
| `GET /intents/:id`              | Re-read a parsed intent and its recommendations for the calling user         |
| `GET /marketplace/agents`       | Active listings (no embeddings)                                              |
| `GET /marketplace/agents/:slug` | One listing and its capabilities                                             |
| `POST /orchestrator/plans`      | Bind rank-1 matches, persist a workflow, return the authorization plan       |
| `POST /orchestrator/plans/:id/grant` | Record a browser `grantSession` that matches the plan. Sets `granted: true`  |
| `POST /orchestrator/plans/:id/execute` | Restore the session, run the skill play, persist the userOp. Does not widen scope |
| `POST /orchestrator/plans/:id/revoke` | Record a browser `revokeSession`. Marks the session revoked and cancels an unfinished plan |
| `GET /wallets/me/balances` | Native + token balances via `client.balances`. No signer. |
| `GET /skills`                   | Competence catalog (playbook ids, may / may-not). A skill grants nothing     |
| `GET /skills/:id`               | One skill: address table and call targets used to intersect the session      |

---

## 21. Marketplace bring-up

Adapters, sessions and payments wait until a parsed intent can match a listing. The order is
load-bearing: each step produces the foreign keys the next step needs.

```text
1. catalog          assets, protocols, platform publisher
2. registry         developer → draft agent → identity + capability → active
3. capabilities     taxonomy, I/O schema, assets, protocols, one rail; embed on publish
4. capability graph ParsedIntent.legs → nodes (still no agent)
5. discovery        exact taxonomy_key + assets, then pgvector; rank; write recommendations
6. SwapMaster       first-party listing that closes "swap 5 usdt for bnb"
```

Seed is data, not a schema migration. `npm run db:seed` is idempotent on well-known UUIDs in
`src/database/seed/ids.ts`. It does **not** embed: exact `defi.swap` match does not need a
vector, and seed must not depend on a live model. HTTP `declare()` embeds as a document.

### 21.1 Catalog primitives

A capability cannot name USDT until USDT exists. Seed writes, in this order:

1. A platform `users` row (`oauth` / `rill:platform`) — `developers.user_id` is NOT NULL.
2. Publisher `developers.slug = rill`, already `verified`.
3. BSC mainnet assets: native BNB at the zero-address sentinel, USDT
   `0x55d398326f99059ff77548524641cc36c3e50e3e` (18 decimals on BSC), USDC
   `0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d`, and WBNB
   `0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c` so swap paths can name the wrapped hop
   without putting it on the session allowlist.
4. Protocol `pancakeswap` and its V2 router
   `0x10ed43c718714eb63d5aa57b78b54704e256024e` as an allowlistable `router` contract.

Aave is not seeded until a lending capability needs it.

### 21.2 Developer + agent registry

```text
user ──▶ developers ──▶ agents (draft)
                              │
                              ├── agent_identities   (cached ERC-8004 row)
                              └── capabilities       (≥ 1, active)
                              │
                              ▼
                         agents (active)
```

Publish is refused without both an identity and an active capability. Identity starts as a cache
(`last_sync_block = 0`); commerce will re-read the registry later. Seed writes SwapMaster already
`active` because it satisfies the same two invariants in one transaction.

Third-party self-serve HTTP is the same services (`DeveloperRegistryService`,
`AgentRegistryService`, `CapabilityRegistryService`) on `/marketplace/publishers` and
`/marketplace/agents`. Seed still writes first-party listings without HTTP.

### 21.3 Capability registry

The marketplace object is the capability, not the agent:

| Field                               | Why it exists                                                 |
| ----------------------------------- | ------------------------------------------------------------- |
| `taxonomy_key`                      | Exact match (`defi.swap`). First discovery path.              |
| `input_schema` / `output_schema`    | Orchestrator validates before any spend.                      |
| `capability_assets`                 | SQL filter: a swap that cannot touch USDT never ranks.        |
| `capability_protocols`              | Later, the union of these contracts is the session allowlist. |
| `pricing_model` + `settlement_rail` | `per_job`↔`erc8183`, `per_request`↔`x402`. Check constraint.  |
| `embedding`                         | Fallback only. Gemini task type `RETRIEVAL_DOCUMENT`.         |

SwapMaster is `per_job` / `erc8183`. The `unit_price` is what the _agent charges_, in USDT base
units — not the user's 5 USDT notional.

### 21.4 Intent → capability graph

`CapabilityGraphService` maps each `ParsedIntent.leg` to one node. Extra goal-tree children
(quote vs execute) do not invent capabilities. Linear `dependsOn` is enough until loan protection
needs a real DAG.

```text
leg-0  taxonomyKey: defi.swap
       goalId:      execute
       input:       { fromSymbol: USDT, toSymbol: BNB, amount: "5", chain: bnb }
```

Unknown or rejected messages never reach this step (422 at parse). An empty match after this
step is a marketplace miss, not a parse failure: the intent is stored, `unmatchedTaxonomyKeys`
lists the nodes nothing could fill.

### 21.5 Discovery, then ranking

For each graph node:

1. Resolve symbols against `assets` on the node's chain (unspecified → `BSC_CHAIN_ID`). A missing
   ticker fails closed — no candidates.
2. Exact: `capabilities.taxonomy_key` + `status = active` + parent `agents.status = active`, then
   require every named asset on `capability_assets`.
3. Vector: only if that set is empty, and only if a query embedding and stored documents exist.
   Cosine distance on `capabilities.embedding`. Same asset filter. Fit = `clamp(1 - distance)`.
4. Rank with stored weights so a score is explainable:

   ```text
   capability fit  0.5
   price           0.2   (cheaper listing price wins; equals score 1)
   availability    0.2   (1.0 if cache synced within 7d; 0.5 / 0.25 as it ages;
                          0 if the listing is not active. Read failure stays 1.)
   reputation      0.1   (0.5 when no derived row; never hand-written)
   ```

5. Persist `recommendations` (one row per capability per node) and emit `intent.matched`.

The planner never writes this table. `POST /intents` sequences parse → graph → match and returns
all three. Selection (which recommendation becomes a `workflow_steps` row) is §22.

### 21.6 SwapMaster

Seeded listing that makes the first vertical slice true:

```text
SwapMaster
  identity   ALTANA_CHAIN + ERC8004_REGISTRY_ADDRESS*, onchainAgentId from
             SWAPMASTER_ONCHAIN_AGENT_ID or placeholder "1"
  capability swap / defi.swap
  assets     BNB, USDT, USDC
  protocol   PancakeSwap
  skill      pancakeswap-trading (competence; grants nothing)
  rail       per_job / erc8183  (escrow in $U)
  adapter    still a stub — matching does not execute
```

The cache is not the identity. Token id `1` on a shared registry is usually someone else.
Seed and `POST /identities/swapmaster/sync` re-read `ownerOf` / `tokenURI`. Domain and
endpoint update only when the on-chain record names SwapMaster. Commerce still re-reads
the chain; discovery may serve this cache stale.

```text
"swap 5 usdt for bnb"
        → parsed intent
        → defi.swap graph node
        → SwapMaster recommendation
```

Bring-up:

```text
npm run db:migrate    # from apps/rill-backend
npm run db:seed
```

Then `POST /intents` with that message. The UI "Find agents" control is the same call.

### 21.7 Explicitly not this slice

ERC-8183 escrow and x402 settlement, reputation projection, loan/risk adapters, and agents hiring
other agents. Session grant is §24. Execute is §25.

---

## 22. Bind and authorization plan

A recommendation is a proposal. Binding it is a separate action: pick rank 1 for each graph node,
persist a workflow, and show the narrowest session a human would have to approve. Nothing is
granted on-chain.

```text
SwapMaster recommendation
        │
        ▼
recommendations.selected = true
        │
        ▼
workflows (awaiting_authorization, engine=inline)
  └── workflow_steps  leg-0  agent_job / erc8183  SwapMaster.swap
        │
        ▼
authorization_plan
  calls  Pancake V2 router
         USDT (so approve can succeed)
  spend  5.025 USDT / day   (5 + 0.5% slippage, 18-decimal base units)
  expiry now + 15 minutes
        │
        ▼
UI "Review plan"     granted: false
```

`POST /orchestrator/plans` `{ intentId }` does this. `GET /orchestrator/plans/:id` re-reads it.
A second POST for the same intent returns the existing `awaiting_authorization` row.

The spend cap is exact `numeric` math: `"5"` at 18 decimals is `5000000000000000000`, plus 50 bps
is `5025000000000000000`. A float never touches it.

`workflows.wallet_id` may be null on this draft. The user can read the scope before they have an
Altana account. Granting a session (next) still requires a wallet; the plan lists `wallet` under
`missing` until one exists.

An empty call allowlist **with spend** is refused (422). Omitting `permissions.calls` in Altana is
unrestricted access inside the spend cap — the planner must never propose that. Empty calls **and**
empty spend is a research zero-scope session, and is allowed.

The UI **Review plan** control is this call. **Approve** grants the session (§24).

---

## 23. Skills: competence, not authority

A session gives an agent authority. A skill gives it competence. They are deliberately separate.

A skill is a public playbook from the [Altana Skills Registry](https://github.com/altananetwork/skills)
(`SKILL.md`). It teaches a running agent how a protocol actually works: addresses, quirks, and the
sequence of calls for each common action. It cannot grant anything. An agent holding
`pancakeswap-trading` and no session can do exactly nothing.

Rill does not vendor the playbook. `SkillRegistryService` keeps the skill id, the published
may / may-not scope, the address table, and the session **call** targets. The live file lives
upstream; grant-time should re-read `index.json` once execution exists.

```text
capability   what the marketplace listing claims it can do (taxonomy, assets, rail)
skill        how the protocol works (playbook)
session      what the agent may spend (calls + spend cap + expiry)
```

SwapMaster's listing points at `metadata.skillId = pancakeswap-trading`. The authorization planner
intersects the capability's protocol allowlist with that skill's `callAddresses`. Intersection only
narrows: a playbook cannot add a contract the capability did not already name.

For PancakeSwap trading that means:

| In the skill address table | In the session `calls` |
| -------------------------- | ---------------------- |
| Pancake V2 Router          | yes                    |
| USDT                       | yes, because `approve` |
| WBNB                       | no — path token for quotes, not a call target |

The right-hand may-not column on Review plan is not a promise from the skill author. It is what
the session will enforce on-chain after grant, and what a third party can verify from the Keystore.

Research skills (`dexscreener-token-radar`) write on-chain never. Pair them with a zero-scope
session: no calls, no spend. That is a genuinely safe way to let an agent look around.

`GET /skills` and `GET /skills/:id` browse the competence catalog. Plays still do not sign. Every
on-chain write later goes through `client.execute({ session, calls })`. Reads go straight to RPC.

Registered now, with no extra agents seeded: `aave-v3-lending`, `four-meme`, `copy-trade`,
`dexscreener-token-radar`. Copy-trade composes PancakeSwap execution plus Token Radar screening;
the leader wallet is an input the user must give, never a default.

USDT on BNB Chain is the catalog address `0x55d398326f99059ff77548524641cc36c3e50e3e` (18 decimals).
Skill page snapshots can drift; the catalog is the source of truth.

Granting the session in WalletModule is this slice. The browser signs `grantSession` with the
passkey; the API only records it. Adapters still do not run plays.

---

## 24. Grant session

The admin signer for a user wallet is a passkey. A WebAuthn credential cannot be created or used
on the server, so `grantSession` runs in the browser. WalletModule is still the only backend
module that is allowed to handle session material: it never constructs a signer, and it never
imports the Altana SDK (ESM-only; this Nest build is CommonJS).

```text
Review plan
        │
        ▼
ensure passkey wallet          POST /wallets if GET /wallets/me is 404
        │
        ▼
browser generatePrivateKey     session key, not the admin
browser grantSession           passkey signs; sessionSigner = that key
        │
        ▼
POST /orchestrator/plans/:id/grant
  serializeSession             JSON-safe, no secret → sessions.serialized
  sessionPrivateKey            once, into SESSION_SECRET_DIR, never Postgres
        │
        ▼
PermissionService              grant must match the plan (never wider)
        │
        ▼
sessions + permissions + authorizations
workflows.status = authorized
granted: true
```

Rules the recorder enforces:

- Empty `calls` with spend is 422 (Altana would treat omitted calls as unrestricted).
- Call addresses must match the plan exactly.
- Each spend cap must be the same token and period, and `limit` may only be lower.
- Expiry must be in the future and no later than the plan.
- `walletAddress` must be this user's registered Altana account.

The session is granted **to** the bound agent (`granted_to_agent_id`). Execute restores with
`deserializeSession(stored, signerFromPrivateKey(secret))` inside WalletModule (§25).

The UI **Approve** control is this call. It will prompt WebAuthn. **Run swap** is §25.

---

## 25. Execute the granted session

Authority already exists. This slice runs competence: restore the session, quote on RPC, build
approve + swap, submit through `client.execute({ session, calls })`.

The Nest build is CommonJS and cannot statically import `@altananetwork/sdk` (ESM-only).
WalletModule loads it with a dynamic `import()` at execute time, and nowhere else. Execution
builds calldata only. Orchestrator stays at intent-level steps.

```text
Run swap
        │
        ▼
POST /orchestrator/plans/:id/execute
        │
        ▼
re-read skills index.json     best-effort; catalog addresses still win
        │
        ▼
ExecutionModule               quote getAmountsOut on BSC_RPC_URL
                              build approve(USDT, router) + swapExactTokensForTokens
        │
        ▼
WalletModule                  deserializeSession(stored, signerFromPrivateKey(secret))
                              assert every `to` is on the granted allowlist
                              client.execute({ session, calls })
        │
        ▼
transactions                  userOp hash + tx hash; calldata not stored, only to/selector
workflows.status = completed
granted: true, execution.succeeded
```

Rules:

- Reads never need a session. Quotes are `eth_call`.
- Empty calls, or a target off the allowlist, is 422. Same unrestricted-session rule as grant.
- `sessions.serialized` is the browser's `serializeSession` payload, not a re-cased reconstruction.
  The private key is still only in `SESSION_SECRET_DIR`.
- USDT → BNB is delivered as WBNB. Pancake's native payout uses a 2300-gas `transfer()` that
  cannot run an EIP-7702 wallet. The plan still names BNB; the play records `unwrapToNative`.
- Slippage is the same 50 bps the spend cap used. `amountOutMin` is never 0.
- Deadline is `min(now + 600, session.expiry)` — the skill's 10-minute window, not past the grant.
- A failed execute marks the workflow `failed` and can be retried. A completed plan is idempotent.
- `swap-agent.adapter.ts` still does not run plays. The playbook is `pancakeswap-trading`; the
  adapter must never construct a signer.

The UI **Run swap** control is this call. It does not prompt WebAuthn again.

---

## 26. Session lifecycle

Grant and revoke are admin-signed. The admin is a passkey, so both happen in the browser.
WalletModule records the receipt. Balances and `signOrder` do not need the admin key.

```text
Revoke session
        │
        ▼
browser recoverFromPasskey + revokeSession({ session: publicKey })
        │
        ▼
POST /orchestrator/plans/:id/revoke     or POST /wallets/sessions/:id/revoke
        │
        ▼
sessions.status = revoked
authorizations.revokeTxHash
secret store entry deleted
unfinished workflow → cancelled
```

```text
GET /wallets/me/balances     client.balances (address only)
        │
        ▼
execute preflight            native > 0  and  spend token ≥ amountIn
        │
        ▼
422 wallet_unfunded_native / wallet_insufficient_token
```

`SignatureService.signAppDigest` restores the session and calls `client.signOrder`. It is for
later x402 / ERC-8183 modules — not a public signing oracle. Verifiers must use
`isValidSignature`, not ecrecover.

An **agent wallet** is a separate `wallets` row (`ownerKind = agent`). It is not the user
grant. `WalletService.registerAgentWallet` records an address created elsewhere
(`signerKind = external`). Agent admin-key custody is later. `findForUser` never returns it.

The UI shows native + catalog token balances after Review / Approve, **Revoke session**
(WebAuthn), and refuses Run after revoke.

---

## 27. ERC-8004 identity that commerce can trust

`agent_identities` is a read-through cache (`last_sync_block`). Discovery may serve it
stale. Commerce re-reads the registry. Identity reads go to RPC with viem — not WalletModule
and not the Altana SDK (ESM-only; Nest is CommonJS).

```text
GET /identities/:slug              cache card (public)
GET /identities/:slug?live=1       cache + live ownerOf/tokenURI (not written)
POST /identities/:slug/sync        Privy; write owner + watermark
GET /identities/:slug/registration-calls
                                   encoded register / setAgentURI (no signer)
POST /identities/:slug/keys        Privy + listing developer; secret once
GET /identities/me                 ApiKeyGuard → same card
```

The registry is a plain ERC-721. `tokenURI` is the identity record
(`data:application/json;base64,…` or https). There is no reverse lookup — you need the
agent id. `register` is two-phase (mint assigns the id, then `setAgentURI` patches it
into the record). This slice encodes those calls; it does not mint. A session that
registers must be **selector-scoped**. `{ to: registry }` would also allow `transferFrom`,
`setApprovalForAll`, and `setAgentWallet`.

Agent API keys are `rill_ak_` + 32 random bytes. Only the SHA-256 digest is stored. The
prefix keeps them distinct from a Privy Bearer JWT. `ApiKeyGuard` resolves the key to the
listing's ERC-8004 cache so later x402 charges and reputation land on that actor.

SwapMaster seed writes the configured registry and chain, then best-effort syncs. Unset
`SWAPMASTER_ONCHAIN_AGENT_ID` keeps placeholder `"1"`. A live read that names someone else
updates `owner` and the watermark and leaves listing pointers in place.

---

## 28. ERC-8183 — hire an agent

Matching is not a hire. A `per_job` / `erc8183` capability becomes a job only when someone
opens escrow. The kernel is AgenticCommerce on the chain-selected `ERC8183_ESCROW_ADDRESS`.
Payment token is **$U**, not USDT. Users and agents use the same HTTP rail.

```text
POST /jobs                         persist created + encode hire batch
POST /jobs/:id/fund                execute createJob → registerJob → setBudget
                                   → approve $U → fund  (one session intent)
POST /jobs/:id/deliver             worker (API key) stores deliverable + submit
POST /jobs/:id/accept              hirer reviews off-chain
POST /jobs/:id/settle              Router.settle after the dispute window
POST /jobs/:id/dispute             Policy.dispute inside the window
POST /jobs/:id/refund              claimRefund after expiredAt
POST /jobs/:id/sync                re-read getJob; mirror status
GET  /jobs  ·  GET /jobs/:id
```

`JobCallerGuard` accepts a Privy user or `rill_ak_`. `jobs_no_self_hire` is enforced in
SQL and in create. A `per_request` / x402 capability is 422 `job_not_escrow_rail`.

Hire calls are **selector-scoped**. A grant of `{ to: commerce }` would also allow
`submit` (forge a deliverable) and `claimRefund`. Suggested permissions are returned on
create. The worker's `submit` session is only `submit(uint256,bytes32,bytes)`.

The provider address is the worker's **agent wallet**, not the ERC-8004 owner. Seed
`SWAPMASTER_PROVIDER_ADDRESS` to register that row. Create is 422 `worker_wallet_missing`
until it exists.

On-chain status is OPEN / FUNDED / SUBMITTED / COMPLETED / REJECTED / EXPIRED. Local
`accepted` is the hirer's review of the deliverable while the kernel is still SUBMITTED.
Commerce never imports the Altana SDK; reads are viem; WalletModule executes.

```text
user or agent
     │
     ▼
POST /jobs  (spec hash = keccak256(canonical JSON))
     │
     ▼
session execute hire batch     →  jobs.status = funded
     │
     ▼
worker POST /jobs/:id/deliver  →  job_deliverables + submit
     │
     ▼
hirer accept → settle          →  escrow released
```

---

## 29. x402 — buy a capability

A session can pay for one HTTP resource. This is not a hire: no escrow, no deliverable,
no dispute window. x402 and ERC-8183 never share a code path, settlement flow, or table.

```text
GET  /capabilities/quote            unpaid → 402 challenge (0.01 $U, permit2-exact)
GET  /capabilities/risk-analysis    same price; both settle before the handler runs
POST /x402/fetch                    session-signed outbound payment
GET  /x402/payments                 ledger for the caller
GET  /x402/sessions/:id/provision-calls
GET  /wallets/sessions/:id/x402-provision-calls
```

Outbound `fetchWithX402` lives in WalletModule (`altana-runtime`). Commerce asks
`X402SessionService` to restore the session and sign; it never holds a Session. The
retry sends both `X-PAYMENT` and `PAYMENT-SIGNATURE`. Missing `sessionId` is 422
`x402_session_required` — the platform has no keys of its own.

Rail setup is admin-signed in the browser: `approve($U, Permit2)` plus
`setSignatureCheckerApproval(Permit2)`. Encoded here; submitted by the passkey.

Inbound: missing header → HTTP 402 with a v2 challenge (`eip155:<chain>`, `$U`,
`permit2-exact`). A present header is checked against payTo / asset / amount /
resource, then the facilitator `verify` + `settle`s it. Signatures are ERC-1271
through the facilitator, never `ecrecover`. The capability result is returned only
after settlement is recorded on `x402_payments`.

```text
session (user or agent)
     │
     ▼
402 challenge  →  signX402Payment  →  X-PAYMENT retry
     │
     ▼
facilitator verify + settle
     │
     ▼
x402_payments row  →  capability result
```

`X402CallerGuard` is a copy of the job caller, not an import from `erc8183`.
The merchant routes (`/capabilities/*`) are paid by the envelope, not by Privy.

---

## 30. Reputation is a projection

`reputation` is never hand-written. Ranking and the identity card already treat a missing
row as **0.5**. The only writer is `ReputationProjectionService`, which replays `events`
up to a sequence watermark.

```text
state change
     │
     ▼
events.append  ──same transaction──▶  event_outbox (pending)
     │
     ▼
POST /events/outbox/drain   (or the 30s cron, skipped in test)
     │
     ▼
projection:reputation  →  reputation.lifetime + source_event_seq
```

Job events carry `workerAgentId` so a hire by a user still scores the worker. x402 events
carry `payerAgentId` / `payeeAgentId`. The fold is pure (`reputation-score.ts`): settled
jobs raise the score, refunds and disputes lower it, Laplace smoothing keeps an unknown
agent at 50/100.

```text
POST /reputation/recompute     replay every event; write lifetime rows
POST /events/outbox/drain      deliver pending rows; does not append
```

Both routes are Privy-gated. Drain never writes `events`. Replay the same prefix and the
same score comes out.

---

## 31. Agent network beyond SwapMaster

Catalog primitives come first. Aave and Four.meme are seeded only because loan and launchpad
listings name them.

```text
POST /marketplace/publishers
POST /marketplace/agents                      draft listing
POST /marketplace/agents/:slug/identity       ERC-8004 cache (no mint)
POST /marketplace/agents/:slug/capabilities   taxonomy + rail + assets
POST /marketplace/agents/:slug/publish        needs identity + active capability
GET  /marketplace/publishers/me
```

Same services seed uses. A third-party publisher is the signed-in Privy user.

First-party listings (seed):

| slug          | skill                    | rail     | session                         |
| ------------- | ------------------------ | -------- | ------------------------------- |
| swapmaster    | pancakeswap-trading      | erc8183  | router + USDT approve           |
| token-radar   | dexscreener-token-radar  | erc8183  | zero-scope: no calls, no spend  |
| loan-guardian | aave-v3-lending          | erc8183  | Aave pool; supply/withdraw only |
| risk-oracle   | —                        | x402     | `/capabilities/risk-analysis`   |
| copy-desk     | copy-trade               | erc8183  | leader wallet is a user input   |
| four-desk     | four-meme                | erc8183  | Four.meme token manager         |

Adapters load those playbooks. They never construct a signer and they never import
WalletModule. LP listings wait until a liquidity protocol is in the catalog.

---

## 32. Richer planning

A swap is still one capability-graph node. A protect intent is a DAG the marketplace can
resolve independently:

```text
monitor (research.screen)
   └── risk (risk.health_factor)
         ├── swap (defi.swap)
         └── repay (defi.lending.supply)  ← depends on swap and risk
```

The planner LLM sees the goal tree plus available taxonomy keys and returns that graph.
Zod validates it. A cycle, an unknown key, or an unreachable model falls back to the
deterministic expander. The LLM still never holds wallet access.

Execute walks ready steps (parents succeeded) and dispatches each over one rail:

```text
x402            → pay the capability resource with the granted session
write-onchain   → session execute (user authority, existing swap path)
zero-scope      → ERC-8183 hire (job row; funding is still a later action)
```

Availability is no longer hard-coded: ranking reads listing status and ERC-8004 cache
freshness. A protect plan does not walk the DAG in the HTTP request — that is Temporal (§33).

---

## 33. Durable workflows

Horizon picks the substrate:

```text
1 step, not protect     inline     (swap stays in the request)
several short steps     BullMQ     retries with exponential backoff
kind = protect          Temporal   monitor → wait → check HF → execute → verify
```

BullMQ job `dispatch-step` runs one ready DAG node. Exhausted retries fail the step; they do
not die silently. Tests use an in-process queue with the same attempt count; Redis is skipped
when `NODE_ENV=test`.

Loan protection is a deterministic policy (`reduceLoanProtection`). The Temporal workflow
calls activities for I/O and `sleep` between checks. It never holds a signer.

```text
START → monitor → wait → check
                           ├── HF ≥ 1.3 ──▶ wait
                           └── HF < 1.3 ──▶ execute → verify → COMPLETE
Session expired at execute → failed (session_expired)
maxChecks exhausted        → expired
```

`POST /orchestrator/plans/:id/execute` on a Temporal plan starts `loanProtection` and writes
`workflows.temporal_workflow_id` + `temporal_run_id`. Status becomes `waiting`. A 7-day run
outlives a 15-minute session — activities re-check validity before execute.

The API process starts the workflow by name. A Temporal worker is a separate process against
`TEMPORAL_TASK_QUEUE` (default `rill`). When Temporal is down, the handle is still recorded
locally so the row always traces to the intent.

---

## 34. Chain as source of truth

Postgres caches `agent_identities`, `authorizations`, `jobs` and `transactions`. The chain is
canonical. Discovery may serve a stale cache; commerce and execute re-read.

One viem public client is built from `ALTANA_CHAIN` (56 / 97 / 1) and `BSC_RPC_URL`. Identity,
escrow, quotes, the Keystore reader, the indexer and the transaction tracker inject
`CHAIN_PUBLIC_CLIENT`. They never construct a signer. WalletModule still owns Altana.

```text
GET /chain/keystore/:user/:keyId   isValidKey — public, third-party verification
GET /chain/keystore/:user/keys     getKeys    — expired ids still appear; check isValidKey
```

`isValidKey(user, keyId)` answers *exists AND not revoked AND not expired*. `keyId` is
`keccak256(SEC1 session public key)`. A hit also stamps `authorizations.onchainValid` and
`lastVerifiedAt`.

The in-process indexer ticks on a cron (`NODE_ENV=test` skips it, like the outbox). It polls
known ERC-8004 identities, ERC-8183 jobs with an `onchainJobId`, and Keystore grants, then
advances `indexer_cursors` to `head − 8` so a shallow reorg is re-applied idempotently. This is
not the production indexer service.

`TransactionService.record` writes every platform-originated userOp. A second cron polls
receipts: no receipt → `submitted` (then `dropped` after 30 minutes); included but unconfirmed →
`included`; `status = success` → `succeeded`; reverted → `reverted`.

---

## 35. Loan Guardian as an agent economy

The user hires Loan Guardian. Loan Guardian does not contain risk or swap — it buys and hires:

```text
User session ──grant──▶ Loan Guardian
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Risk Oracle    SwapMaster      Aave
            x402         ERC-8183      user session
         (composer        (composer     (repay /
          buys)            hires)        withdraw)
```

x402 still settles with the **user's** granted session (the user funded the protect plan).
The ledger stamps `payerAgentId` as Loan Guardian so reputation sees the composer.
ERC-8183 jobs have `hirerKind = agent` and `hirerAgentId = loan-guardian`. Aave stays on
the user session — that is the authority the human approved.

`composeProtectActions` is the policy. Temporal activities call
`LoanGuardianComposerService`; they never construct a signer. A protect grant is recorded
against the `canSubcontract` listing (Loan Guardian), not the first DAG node (Token Radar).

SwapMaster as a worker still needs an agent wallet to receive escrow. Missing wallet is
`hired: false` / `worker_wallet_missing` — the compose event still lands.
