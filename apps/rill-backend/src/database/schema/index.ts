// Barrel re-exporting every table, relation and enum, so the Drizzle client is fully typed.
// Ordered by dependency, which is also the order a fresh database has to be seeded in.

export { EMBEDDING_DIMENSIONS } from './common';
export * from './enums';

// identity
export * from './users';
export * from './api-keys';
export * from './developers';
export * from './wallets';

// catalog
export * from './assets';
export * from './protocols';
export * from './agents';
export * from './agent-identities';
export * from './capabilities';

// planning
export * from './intents';
export * from './recommendations';
export * from './workflows';
export * from './workflow-steps';

// authority
export * from './sessions';
export * from './permissions';
export * from './authorizations';

// commerce
export * from './jobs';
export * from './job-deliverables';
export * from './x402-payments';
export * from './transactions';

// trust
export * from './reputation';

// audit
export * from './events';
