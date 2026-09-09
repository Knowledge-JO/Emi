# Emi — architecture todo

Working checklist against [ARCHITECTURE.md](./ARCHITECTURE.md). A session grants authority; a
skill is competence. Adapters never hold a signer. The LLM never holds wallet access.

The live vertical slice stops at **Loan Guardian as an agent economy**. Remaining work is in
Explicitly later — do not pull it forward.

```text
message → parsed intent
       → capability graph
       → discover / rank agents
       → bind match + authorization plan
       → skills (competence catalog)
       → grant Altana session
       → restore session + execute skill playbook
       → revoke / balances / signOrder / agent wallet row
       → ERC-8004 identity (live read + API-key auth)
       → ERC-8183 hire (create / fund / deliver / settle)
       → x402 pay (outbound fetch + inbound merchant)
       → reputation (projection + outbox drain)
       → agent network (publisher HTTP + first-party listings)
       → richer planning (DAG + planner + router + availability)
       → durable workflows (BullMQ + Temporal + loan protection)
       → chain as source of truth
       → Loan Guardian composing as an agent economy   ← last completed slice
```

Layering is one-way:

```text
intent → marketplace → orchestrator → commerce → execution → wallet → chain
```

Only WalletModule talks to Altana. The Nest backend is CommonJS and cannot import
`@altananetwork/sdk` (ESM-only). The browser can.

---

## Done

### Platform

- [x] NestJS API + Next.js web app, module map and boundary rules (§18)
- [x] PostgreSQL + Drizzle schema: 27 tables, invariants, pgvector (§13)
- [x] Migrations `0000`–`0004` (pgvector, init, Privy auth provider, optional `workflows.wallet_id`, indexer cursors)
- [x] Typed env + config (`ALTANA_CHAIN`, session secret store, ERC-8183 / ERC-8004 addresses)
- [x] BNB mainnet **and** testnet escrow/registry addresses; config and seed follow `ALTANA_CHAIN`
- [x] Event append on state changes; `events` table is the audit source

### Authentication (§19)

- [x] Privy as identity only — no funds, no on-chain authority
- [x] `POST /auth/session`, `DELETE /auth/session`, `GET /users/me`
- [x] Offline JWT verification (`PRIVY_APP_ID` + public verification key)

### Intent (§20)

- [x] `POST /intents` — LLM parse → Zod `ParsedIntent` → persist
- [x] Amounts as decimal strings; unparseable message → 422
- [x] LanguageModel + EmbeddingModel ports (Gemini / OpenAI / Anthropic)
- [x] `GET /intents/:id`

### Marketplace bring-up (§21)

- [x] Catalog seed: platform publisher, BNB / USDT / USDC / WBNB, Pancake V2 router
- [x] Developer + agent registry (publish requires identity + active capability)
- [x] Capability registry: taxonomy, I/O schema, assets, protocols, rail + pricing constraint
- [x] Intent → capability graph from parsed legs (linear `dependsOn`)
- [x] Discovery: exact `taxonomy_key` + assets, then pgvector; rank; write `recommendations`
- [x] Ranking weights: fit 0.5, price 0.2, availability 0.2, reputation 0.1
- [x] SwapMaster seeded (`defi.swap`, USDT/BNB/USDC, PancakeSwap, `per_job` / `erc8183`)
- [x] `GET /marketplace/agents`, `GET /marketplace/agents/:slug`
- [x] UI **Find agents** = `POST /intents`

### Bind + authorization plan (§22)

- [x] `POST /orchestrator/plans` `{ intentId }` — bind rank-1, persist workflow
- [x] Authorization plan: calls (router + USDT approve), spend (notional + 50 bps, exact integer math), expiry 15 minutes
- [x] Empty calls **with** spend → 422; empty calls **and** empty spend allowed (research zero-scope)
- [x] `workflows.wallet_id` nullable so a plan can exist before an Altana wallet
- [x] `GET /orchestrator/plans/:id`
- [x] UI **Review plan**

### Skills (§23)

- [x] Skill registry (id, may / may-not, address table, `callAddresses`) — no vendored `SKILL.md`
- [x] Planner intersects protocol allowlist with skill call targets (never widens)
- [x] Registered: `pancakeswap-trading`, `aave-v3-lending`, `four-meme`, `copy-trade`, `dexscreener-token-radar`
- [x] First-party listings seeded after their catalog primitives exist
- [x] `GET /skills`, `GET /skills/:id`
- [x] Plan response includes `skills[]` and `skillId` on steps
- [x] UI May / May not on Review plan

### Grant session (§24)

- [x] Browser passkey wallet: `GET /wallets/me` or `createPasskeyWallet` / `recoverFromPasskey` then `POST /wallets`
- [x] Browser `generatePrivateKey` + `grantSession({ sessionSigner })` with plan scope
- [x] `POST /orchestrator/plans/:id/grant` — `serializeSession` + session private key
- [x] `PermissionService.assertGrantMatchesPlan` — exact call set, spend ≤ plan, expiry ≤ plan and future
- [x] Session key in `SESSION_SECRET_DIR` (never Postgres)
- [x] Rows: `sessions`, `permissions`, `authorizations`; workflow → `authorized`, `granted: true`
- [x] First grant marks `wallets.adminKeyRegistered`
- [x] UI **Approve** (WebAuthn). Does not swap.

### Execute session (§25)

- [x] Restore: `deserializeSession(stored, signerFromPrivateKey(secret))` inside WalletModule
- [x] Load `pancakeswap-trading` playbook at execute time (re-read upstream `index.json`, catalog wins)
- [x] Execution module builds calldata only; orchestrator stays intent-level
- [x] `client.execute({ session, calls })` for the bound SwapMaster step
- [x] Persist the userOp / tx on `transactions`
- [x] UI **Run swap** after Approve; show receipt / failure
- [x] Reads (quotes) go straight to RPC — they do not need a session
- [x] USDT → BNB is received as WBNB (Altana cannot take a 2300-gas `transfer()`)

### Session lifecycle (§26)

- [x] `revokeSession` in the browser; API records revoke and deletes the session secret
- [x] `GET /wallets/me/balances` via `client.balances`
- [x] Execute preflight: native gas + spend-token balance
- [x] `SignatureService.signAppDigest` (`client.signOrder`) for later rails — not a public oracle
- [x] Agent wallet registry (`ownerKind = agent`, `signerKind = external`), distinct from the user grant

### Identity that commerce can trust (§12, §21.2, §27)

- [x] Live ERC-8004 registry read (viem) + encoded `register` / `setAgentURI` (no mint, no signer)
- [x] Re-seed / sync SwapMaster against the chain-selected `ERC8004_REGISTRY_ADDRESS*`
- [x] Identity HTTP: capabilities, endpoint, developer, reputation (`GET /identities/:slug`)
- [x] Agent API-key auth resolved to an ERC-8004 identity (`rill_ak_…` → `GET /identities/me`)

### ERC-8183 — hire an agent (§7, §28)

- [x] Create / fund escrow on the chain-selected `ERC8183_ESCROW_ADDRESS` (atomic 5-call hire)
- [x] Job lifecycle API: create, fund, deliver, accept, settle, dispute, refund, cancel
- [x] Mirror on-chain state into `jobs` + `job_deliverables` (`POST /jobs/:id/sync`)
- [x] Users hire agents **and** agents hire agents through the same rail (`JobCallerGuard`)
- [x] `jobs_no_self_hire` stays enforced; `per_request` capabilities are refused

### x402 — buy a capability (§8, §15, §29)

Separate module and tables from ERC-8183. Never share a code path.

- [x] Outbound: `fetchWithX402({ session, url })` so a session can pay for HTTP resources
- [x] Ledger: every payment in/out on `x402_payments` (session required for outbound)
- [x] Rail provisioning (wallet admin) before an agent can pay
- [x] Merchant guard + settlement for Emi’s own paid routes (`/quote`, `/risk-analysis`, …)
- [x] Facilitator settlement confirmed on-chain

### Reputation (§13.1 rule 4, §30)

- [x] Projection job: recompute `reputation` from `events` up to a sequence watermark
- [x] Nothing else writes that table (ranking already reads it; missing row = 0.5)
- [x] Outbox drain so event delivery is transactional (`events.module` appends; drain does not)

### Agent network beyond SwapMaster (§1, §21.1, §31)

Seed the catalog primitive **before** the listing.

- [x] Third-party self-serve registry HTTP (`/marketplace/publishers`, listing draft → publish)
- [x] Research agent + `dexscreener-token-radar` (zero-scope session: no calls, no spend)
- [x] Loan / Aave catalog + `aave-v3-lending` listing (supply/withdraw; no borrow in that skill)
- [x] Risk agent as an x402 capability other agents can buy
- [x] Copy-trade (PancakeSwap execution + Token Radar; leader wallet is a user input)
- [x] four.meme listing after the Four.meme protocol is in the catalog (LP still waits)
- [x] Agent adapters run playbooks; they never construct a signer

### Richer planning (§5, §6, §32)

- [x] Goal trees that are a real DAG (loan protection: monitor → risk → swap → repay)
- [x] Planner LLM: goal tree + available capabilities → schema-validated plan
- [x] Agent router: dispatch a step over the right rail (session execute / x402 / ERC-8183)
- [x] Availability health checks (identity cache freshness; missing read stays 1.0)

### Durable workflows (§14, §33)

Inline engine is enough for a single swap. Monitoring is not.

- [x] BullMQ for short-lived steps (retries, backoff)
- [x] Temporal for long-running work (“monitor my loan for 7 days…”)
- [x] Loan-protection workflow: monitor → wait → check HF → execute → verify
- [x] `workflows` row holds the Temporal handle

### Chain as source of truth (§13.1 rule 5, §34)

- [x] viem public clients per chain (BSC primary; testnet when `ALTANA_CHAIN=bnb-testnet`)
- [x] Keystore reader: `isValidKey(user, keyId)` for third-party verification
- [x] Indexer: ERC-8183 job state, ERC-8004 identity, Keystore grants/revocations
- [x] Transaction tracker: record, poll receipt, resolve finality

### Loan Guardian as an agent economy (§3, §7, §35)

- [x] Loan Guardian composing Risk + Swap + Aave (x402 buy, ERC-8183 hire, user-session Aave)
- [x] Protect grant recorded against the composing agent (`canSubcontract`)
- [x] Temporal activities dispatch the composed rails (no signer in the adapter)

---

## Next (recommended order)

The vertical slice through the agent economy is in place. Remaining **backend** items stay in Explicitly later.

---

## Frontend — wired

`/signin` and `/app` cover the swap chat slice. Additional screens call APIs that already
existed; no new backend was added. Landing stays marketing-only.

### Product gaps in `/app`

- [x] Show Altana passkey wallet from `GET /wallets/me` instead of the Privy “not connected” pill
- [x] Show balances after grant via `GET /wallets/me/balances`
- [x] Persist chat history (`GET /intents/:id`); refresh should not wipe conversations
- [x] Sign-out always calls `DELETE /auth/session` (`WalletButton` currently Privy-only)
- [x] Long-running protect / Temporal UX: keep polling, show DAG / monitor progress, do not stop at ~60s
- [x] ERC-8183 job UI: hire / fund / deliver / settle against `/jobs/*` when a plan step uses that rail
- [x] x402 pay UI: quotes and payment ledger against `/x402/*` and `/capabilities/*` when a plan step uses that rail

### Backend-ready screens

- [x] Agent detail (`GET /marketplace/agents/:slug`) and skills browser (`GET /skills`, `GET /skills/:id`)
- [x] Publisher self-serve: register, draft listing, attach identity / capabilities, publish
- [x] ERC-8004 identity card, sync, and API-key issuance (`/identities/*`)
- [x] Session detail and revoke-by-session-id (`GET /wallets/sessions/:id`, `POST …/revoke`)
- [x] Account profile from `GET /users/me` (today only the session handshake returns the user)

### Leftover mock

- [x] Remove unused mock command-center: `marketplace-mock.ts`, `plan-card.tsx`, `session-dashboard.tsx`, `clarifying-question.tsx`, `omn-input.tsx`, `suggestion-pills.tsx`, `top-nav.tsx`
- [x] Remove unused wired composers: `IntentComposer`, `SignInPanel` (`/app` already superseded them)

---

## Explicitly later

Do not pull these forward to “make the swap look complete.”

- [ ] Emi as a paid x402 merchant for third-party agents (§15)
- [ ] Blockchain indexer as a production service
- [ ] Full audit-trail read API (`audit.service`)
- [ ] PATCH `/users/me` and user-linked wallet / session / intent history UI
- [ ] Ethereum / Base Altana chains (config allows `ethereum`; product is BNB-first)

---

## How to use this list

1. Pick the next unchecked item in **Next**, not a later section.
2. Keep layering: wallet restores the session; execution builds calldata; agents load skills;
   commerce settles; orchestrator only plans and routes.
3. After a slice lands, tick it here and add a section to `ARCHITECTURE.md` the way §§20–35 do.
4. Seed after any catalog or `ERC8004_REGISTRY_ADDRESS*` change: `npm run db:seed` from
   `apps/rill-backend`. Set `SWAPMASTER_ONCHAIN_AGENT_ID` after mint. Restart the API after
   `.env` changes.
5. Switch testnet with `ALTANA_CHAIN=bnb-testnet` and `NEXT_PUBLIC_ALTANA_CHAIN=bnb-testnet`,
   then re-seed so SwapMaster’s cached registry matches.
