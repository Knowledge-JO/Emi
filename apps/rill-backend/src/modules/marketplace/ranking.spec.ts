import { rankCandidates } from './ranking';

describe('rankCandidates', () => {
  const base = {
    agentId: 'agent-a',
    capabilityFit: 1,
    availability: 1,
    reputation: 0.5,
  };

  it('prefers the cheaper listing when fit is equal', () => {
    const ranked = rankCandidates([
      {
        ...base,
        capabilityId: 'expensive',
        agentId: 'agent-a',
        unitPrice: '200',
      },
      {
        ...base,
        capabilityId: 'cheap',
        agentId: 'agent-b',
        unitPrice: '50',
      },
    ]);

    expect(ranked.map((row) => row.capabilityId)).toEqual([
      'cheap',
      'expensive',
    ]);
    expect(ranked[0]?.priceScore).toBe(1);
    expect(ranked[1]?.priceScore).toBe(0);
  });

  it('lets capability fit outweigh a lower price', () => {
    const ranked = rankCandidates([
      {
        ...base,
        capabilityId: 'exact',
        capabilityFit: 1,
        unitPrice: '200',
      },
      {
        ...base,
        capabilityId: 'semantic',
        capabilityFit: 0.2,
        unitPrice: '1',
      },
    ]);

    expect(ranked[0]?.capabilityId).toBe('exact');
  });

  it('gives every equally priced candidate a full price score', () => {
    const ranked = rankCandidates([
      { ...base, capabilityId: 'a', unitPrice: '10' },
      { ...base, capabilityId: 'b', agentId: 'agent-b', unitPrice: '10' },
    ]);

    expect(ranked.every((row) => row.priceScore === 1)).toBe(true);
  });
});
