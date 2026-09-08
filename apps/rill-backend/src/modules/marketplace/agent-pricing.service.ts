import { Injectable } from '@nestjs/common';

export type CapabilityQuote = {
  amount: string;
  assetId: string;
  settlementRail: 'x402' | 'erc8183';
};

/**
 * Listing price, not a swap quote. The number that lands on `recommendations.quoted_price` is
 * what the agent charges to do the job, in the capability's price asset. The swap's 5 USDT is
 * the user's notional and is not this figure.
 */
@Injectable()
export class AgentPricingService {
  quote(capability: {
    unitPrice: string;
    priceAssetId: string;
    settlementRail: CapabilityQuote['settlementRail'];
  }): CapabilityQuote {
    return {
      amount: capability.unitPrice,
      assetId: capability.priceAssetId,
      settlementRail: capability.settlementRail,
    };
  }
}
