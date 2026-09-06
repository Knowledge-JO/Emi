// TODO: Barrel re-exporting every table + relation so the Drizzle client is fully typed.
// Table groups, in dependency order:
//   identity      users, developers, wallets
//   catalog       agents, agent_identities, capabilities, protocols, assets
//   planning      intents, recommendations, workflows, workflow_steps
//   authority     sessions, permissions, authorizations
//   commerce      jobs, job_deliverables, x402_payments, transactions
//   trust         reputation
//   audit         events
