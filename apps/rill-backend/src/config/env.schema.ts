// TODO: Zod schema for every environment variable the backend requires — DATABASE_URL, REDIS_URL,
// TEMPORAL_ADDRESS, BSC_RPC_URL, ALTANA_CHAIN, X402_FACILITATOR_URL, ERC8183_ESCROW_ADDRESS,
// ERC8004_REGISTRY_ADDRESS, PLANNER_MODEL, OPENAI_API_KEY — validated once at boot so a
// misconfigured deployment fails fast instead of at first chain call.
