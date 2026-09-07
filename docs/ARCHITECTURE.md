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

User says *"Protect my BNB loan."* The Intent Engine produces a goal tree:

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

PostgreSQL + Drizzle, with `pgvector` for semantic agent discovery. Twenty-six tables in seven
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
    └── event_outbox           transactional delivery of those events
```

Four tables are additions to the original sketch, each forced by a rule above:
`protocol_contracts` (rule 1 — an address that is not a known protocol contract can never reach a
session allowlist), `capability_assets` and `capability_protocols` (discovery has to filter in SQL,
not in application code), and `event_outbox` (rule 4 — a derived score is only reproducible if
event delivery is transactional). `api_keys` backs the existing API-key guard.

### 13.3 The authority chain

```text
users ──▶ wallets ──▶ sessions ──▶ permissions
                         │              (call rows + spend rows)
                         │
                         ├──▶ authorizations   grant tx, fee, expiry, revocation
                         │
                         └──▶ transactions     what the session actually did
```

`sessions` holds the output of `serializeSession` and a *reference* to the secret store. The
private key is never in Postgres. Rebuilding a usable session is deliberately a two-source
operation: `deserializeSession(row.serialized, signerFromPrivateKey(secret))`.

An empty allowlist is not "no access" — omitting `permissions.calls` grants a session *every*
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

The planner writes `intents` and nothing else. Commerce artifacts point *back* at the step that
caused them, so a step stays a plan and the money keeps its own trail.

### 13.6 Discovery

`agents.description_embedding` and `capabilities.embedding` are `vector(1536)` columns with HNSW
cosine indexes. Matching a goal node runs exact first, vector second: `capabilities.taxonomy_key`
for a declared match (`defi.swap`, `defi.lending.repay`), then nearest-neighbour on the embedding
for anything the taxonomy misses. Asset and protocol filters are joins, so a semantic match that
cannot handle USDT on BNB Chain never reaches the ranker.

### 13.7 Invariants enforced by the database

| Constraint                             | What it prevents                                      |
| -------------------------------------- | ----------------------------------------------------- |
| `capabilities_rail_matches_pricing`    | an escrow job created for a single API request        |
| `workflow_steps_rail_matches_kind`     | a step that hires an agent but settles over x402      |
| `workflow_steps_paid_step_needs_agent` | paying for a step with no agent to pay                |
| `x402_payments_outbound_needs_session` | the platform spending without a granted session       |
| `permissions_call_shape` / `_spend_shape` | a scope row that is neither a call nor a cap       |
| `wallets_owner_matches_kind`           | a wallet owned by both a user and an agent, or neither |
| `jobs_hirer_matches_kind`              | an escrow job with an ambiguous hirer                 |
| `jobs_no_self_hire`                    | an agent inflating its own job count                  |
| `*_lowercase` (addresses)              | a re-cased address breaking an on-chain match         |
| `assets_decimals_range`                | a decimals value that silently rescales every limit   |

### 13.8 Migrations

```text
0000_enable_pgvector       CREATE EXTENSION vector
0001_init                  enums, 26 tables, indexes, constraints
0002_add_privy_auth_provider   auth_provider += 'privy'
```

Order is load-bearing: the extension must exist before the first `vector` column or HNSW index, so
migrations are always applied in sequence on a fresh database — never `db:push` against one.

---



## 14. Queues and workflow engine

```text
Redis → BullMQ      short-lived jobs
Temporal            durable, long-running workflows
```

BullMQ handles fire-and-forget work. Anything like *"Monitor my loan for 7 days and act when health
factor < 1.3"* is a **durable workflow** and belongs in Temporal:

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
    ├── agents/                   agent network adapters (swap, loan, risk, liquidity,
    │                             token, research)
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

Privy is the identity provider for humans. It answers *"who is calling the API"* and nothing more:
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

| Route                  | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `POST /auth/session`   | Completes sign-in; creates the account on first call. Idempotent. |
| `DELETE /auth/session` | Records the sign-out. Privy owns the session; there is nothing on our side to revoke. |
| `GET /users/me`        | The account behind the calling token.                             |

The handshake is explicit rather than implicit on first read, so account creation is an action with
an event behind it instead of a side effect of an arbitrary `GET`.

### 19.4 Two credentials, two questions

| Credential            | Answers                          | Issued by | Enforced by     |
| --------------------- | -------------------------------- | --------- | --------------- |
| Privy access token    | Who is calling the API?          | Privy     | `PrivyAuthGuard` |
| Altana session key    | What may be signed on-chain?     | User      | The chain       |

Agents are the other caller class and authenticate differently — an API key resolved to an
ERC-8004 identity, so x402 charges and reputation land on the right actor. Not built yet.

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
unparseable message is a 422, not a guessed swap.

Chat and embeddings are separate ports (`LanguageModel`, `EmbeddingModel`) so the planner and
discovery can use Gemini, OpenAI, or Anthropic independently. Anthropic has no embedding model.
Both embedding providers emit 1536 dimensions, matching the `vector` columns.

| Route           | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `POST /intents` | Parse a message into the object above and persist it |
| `GET /intents/:id` | Re-read a parsed intent for the calling user      |

