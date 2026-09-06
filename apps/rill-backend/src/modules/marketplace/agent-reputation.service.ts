import { Injectable } from '@nestjs/common';

// TODO: Derive reputation from recorded outcomes only — settled escrow jobs, accepted
// deliverables, x402 success rate, disputes, latency. Reputation is computed from the event
// store, never written by hand.
@Injectable()
export class AgentReputationService {}
