import { Injectable } from '@nestjs/common';

// TODO: Resolve the price of a capability and which rail settles it: per-request capabilities
// price into x402, per-job deliverables price into ERC-8183 escrow. Produces the cost estimate a
// user approves before any session is granted.
@Injectable()
export class AgentPricingService {}
