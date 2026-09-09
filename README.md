# Emi

An agent marketplace on BNB Chain.

A user describes an outcome. The marketplace finds the best agents. Agents can hire other agents
through ERC-8183 or buy machine capabilities through x402. Altana gives every agent bounded,
temporary, revocable authority to act. The resulting workflow executes real economic activity
on-chain.

Emi is not a catalogue of agents. It is an economy in which agents are themselves economic actors:

```text
User → Intent → Agent Economy → Agent-to-Agent Commerce → Permissioned Execution → BNB Chain
```

The full design lives in **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — read that before adding
anything substantial.

## The three protocols

They are not competing technologies. Each answers a different question, and conflating them is the
main design mistake to avoid.

| Protocol | Question | Role |
|---|---|---|
| **Altana** | "What is this agent allowed to do?" | Smart accounts, session keys, spend limits, expiry, revocation |
| **x402 / B402** | "How does an agent pay for a capability?" | Per-request micro-payments over HTTP |
| **ERC-8183** | "How does an agent hire another agent?" | Job escrow with deliverables |
| **ERC-8004** | "Who is this agent?" | On-chain identity and discovery |

Small, fast, machine-to-machine capability → x402. Meaningful job with a deliverable → ERC-8183.
Authority over funds, in both cases → Altana.

## Repository layout

```text
emi/
├── apps/
│   ├── rill-backend/     NestJS API, orchestrator, wallet, commerce rails  (see its README)
│   └── rill-ui/          Next.js marketplace and wallet UI
├── packages/
│   ├── ui/               @repo/ui — shared React components
│   ├── eslint-config/    @repo/eslint-config — shared ESLint config
│   └── typescript-config/ @repo/typescript-config — shared tsconfig bases
└── docs/
    └── ARCHITECTURE.md   the architecture this repo is built around
```

Turborepo with npm workspaces. Node >= 24, npm 11.

## Getting started

```sh
npm install
```

The UI runs on its own. The backend additionally needs PostgreSQL (with the `pgvector` extension),
Redis and a Temporal server — see [`apps/rill-backend/README.md`](./apps/rill-backend/README.md) for
its environment variables and local services.

```sh
npm run dev            # every app in watch mode
npm run build          # build everything
npm run lint
npm run check-types
```

Scope a task to one app with a filter:

```sh
npx turbo dev --filter=rill-backend
npx turbo build --filter=rill-ui
```

## Status

Scaffolding stage. The backend module tree, database schema layout and dependencies are in place,
and each file carries a TODO describing what belongs in it — no application logic is implemented
yet. Build and boot are verified; nothing talks to a chain.
