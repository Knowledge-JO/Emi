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

| Protocol | Question it answers | Role |
|---|---|---|
| **Altana** | "What is this agent allowed to do?" | Authority layer |
| **x402 / B402** | "How does an agent pay for a capability/API?" | Micro-payment rail |
| **ERC-8183** | "How does an agent hire another agent for a job?" | Job escrow |
| **ERC-8004** | "Who is this agent?" | Identity / discovery |

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

PostgreSQL + Drizzle, with `pgvector` for semantic agent discovery.

```text
PostgreSQL
│
├── users                 identity, auth
├── wallets               Altana smart accounts
├── agents                marketplace listings
├── agent_identities      ERC-8004 records
├── developers            agent publishers
├── capabilities          machine-matchable capability declarations
├── protocols             PancakeSwap, Aave, …
├── assets                BNB, USDT, USDC, …
│
├── intents               raw user goals
├── recommendations       ranked agent matches
├── workflows             resolved capability graphs
├── workflow_steps        individual nodes
│
├── sessions              Altana session keys (serialized, no secrets)
├── permissions           calls + spend scopes
├── authorizations        on-chain grant records
│
├── jobs                  ERC-8183 escrow jobs
├── job_deliverables      job outputs
├── x402_payments         micro-payment ledger
├── transactions          on-chain tx records
│
├── reputation            agent scores
└── events                event store
```

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
│   └── schema/                   one file per table group
│
└── modules/
    ├── users/                    accounts, profiles
    ├── auth/                     sessions, API keys, agent auth
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

1. **Only `wallet` talks to Altana.** No other module constructs a signer or a session.
2. **Only `execution` builds calldata.** Orchestrator produces intent-level steps, never raw calls.
3. **The planner LLM has no wallet, no keys, no direct chain access.** It returns a plan; the
   authorization planner turns that plan into a scoped session grant a human approves.
4. **`commerce/x402` and `commerce/erc8183` never share a code path.** Different rails, different
   settlement, different tables.
5. **Every state transition emits an event** into `events` for audit and replay.
