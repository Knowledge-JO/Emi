import { AgentSelectionService } from './agent-selection.service';

describe('AgentSelectionService', () => {
  const selection = new AgentSelectionService();

  it('picks rank 1 per graph node and reports unmatched nodes', () => {
    const { selected, unmatched } = selection.pickRankOne(
      ['leg-0', 'leg-1'],
      [
        rec('leg-0', 2, 'alt'),
        rec('leg-0', 1, 'swapmaster'),
        rec('leg-1', 1, 'repaybot'),
      ],
    );

    expect(selected.map((row) => row.capabilityId)).toEqual([
      'swapmaster',
      'repaybot',
    ]);
    expect(unmatched).toEqual([]);
  });

  it('honors an explicit pick over rank 1', () => {
    const { selected, invalid } = selection.pickRankOne(
      ['leg-0'],
      [rec('leg-0', 1, 'swapmaster'), rec('leg-0', 2, 'alt')],
      [{ graphNodeId: 'leg-0', agentId: 'agent-alt' }],
    );
    expect(selected.map((row) => row.capabilityId)).toEqual(['alt']);
    expect(invalid).toEqual([]);
  });

  it('rejects a pick that is not a recommendation for that node', () => {
    const { invalid } = selection.pickRankOne(
      ['leg-0'],
      [rec('leg-0', 1, 'swapmaster')],
      [{ graphNodeId: 'leg-0', agentId: 'agent-unknown' }],
    );
    expect(invalid).toEqual([
      { graphNodeId: 'leg-0', agentId: 'agent-unknown' },
    ]);
  });

  it('lists a node with no recommendations as unmatched', () => {
    const { unmatched } = selection.pickRankOne(['leg-0'], []);
    expect(unmatched).toEqual(['leg-0']);
  });
});

function rec(graphNodeId: string, rank: number, capabilityId: string) {
  return {
    id: `${capabilityId}-${rank}`,
    intentId: 'intent-1',
    graphNodeId,
    requestedTaxonomyKey: 'defi.swap',
    agentId: `agent-${capabilityId}`,
    capabilityId,
    rank,
    score: 1,
    capabilityFitScore: 1,
    reputationScore: 0.5,
    priceScore: 1,
    availabilityScore: 1,
    scoringWeights: null,
    quotedPrice: '1',
    quotedAssetId: 'asset-1',
    settlementRail: 'erc8183' as const,
    selected: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
