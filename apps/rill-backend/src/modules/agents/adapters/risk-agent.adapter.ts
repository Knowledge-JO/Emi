import { Injectable } from '@nestjs/common';

// TODO: Risk agent (Risk Oracle) — health factors, liquidation distance, exposure. Sells a
// per-request capability, so it settles over x402, not escrow.
@Injectable()
export class RiskAgentAdapter {}
