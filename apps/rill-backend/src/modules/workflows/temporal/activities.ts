// TODO: Temporal activities — the only place a workflow touches the outside world: read health
// factor, call an agent, pay via x402, create an escrow job, execute a protocol call, verify a
// session is still valid. Activities must be idempotent; Temporal will retry them.
