export const DEFAULT_SCORING_WEIGHTS = {
  capabilityFit: 0.5,
  price: 0.2,
  availability: 0.2,
  reputation: 0.1,
} as const;

export type ScoringWeights = {
  capabilityFit: number;
  price: number;
  availability: number;
  reputation: number;
};

export type RankInput = {
  capabilityId: string;
  agentId: string;
  unitPrice: string;
  capabilityFit: number;
  availability: number;
  reputation: number;
};

export type RankedCandidate = RankInput & {
  rank: number;
  score: number;
  priceScore: number;
  scoringWeights: ScoringWeights;
};

/**
 * Step 5b: turn candidates into an explainable order. Weights are stored on the recommendation
 * row so a later reader can recompute the total from the components.
 *
 * Cheaper is better. Equal prices all score 1. Reputation defaults to 0.5 upstream for agents
 * with no derived score yet — a new listing is not punished, and a score cannot be bought here.
 */
export function rankCandidates(
  candidates: RankInput[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): RankedCandidate[] {
  const priceScores = invertMinMax(
    candidates.map((row) => BigInt(row.unitPrice)),
  );

  const scored = candidates.map((row, index) => {
    const priceScore = priceScores[index] ?? 1;
    const score =
      weights.capabilityFit * clamp01(row.capabilityFit) +
      weights.price * priceScore +
      weights.availability * clamp01(row.availability) +
      weights.reputation * clamp01(row.reputation);

    return {
      ...row,
      priceScore,
      score,
      scoringWeights: weights,
      rank: 0,
    };
  });

  scored.sort(
    (a, b) => b.score - a.score || a.capabilityId.localeCompare(b.capabilityId),
  );

  return scored.map((row, index) => ({ ...row, rank: index + 1 }));
}

function invertMinMax(values: bigint[]): number[] {
  if (values.length === 0) {
    return [];
  }

  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) {
    return values.map(() => 1);
  }

  const span = max - min;
  return values.map((value) => Number(max - value) / Number(span));
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
