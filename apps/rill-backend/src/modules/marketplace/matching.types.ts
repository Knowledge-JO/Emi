export type MatchedAgent = {
  graphNodeId: string;
  requestedTaxonomyKey: string;
  rank: number;
  score: number;
  capabilityFitScore: number;
  priceScore: number;
  availabilityScore: number;
  reputationScore: number;
  quotedPrice: string;
  quotedAssetId: string;
  settlementRail: 'x402' | 'erc8183';
  match: 'exact' | 'vector';
  agent: {
    id: string;
    slug: string;
    name: string;
  };
  capability: {
    id: string;
    name: string;
    taxonomyKey: string;
  };
};

export type MatchIntentResult = {
  matches: MatchedAgent[];
  unmatchedTaxonomyKeys: string[];
};
