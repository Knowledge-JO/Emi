import {
  decodeAgentUri,
  encodeAgentUri,
  endpointFromRecord,
  listingMatchesOnchain,
} from './erc8004-codec';

describe('erc8004 codec', () => {
  it('round-trips a registration file through a data URI', () => {
    const record = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: 'SwapMaster',
      description: 'Swaps on PancakeSwap.',
      services: [{ name: 'rill', endpoint: 'https://swapmaster.rill.local' }],
    };

    const decoded = decodeAgentUri(encodeAgentUri(record));
    expect(decoded).toEqual({ kind: 'record', record });
    expect(endpointFromRecord(record)).toBe('https://swapmaster.rill.local');
  });

  it('treats an https tokenURI as a pointer, not a record we invented', () => {
    expect(decodeAgentUri('https://agents.example/swapmaster.json')).toEqual({
      kind: 'https',
      url: 'https://agents.example/swapmaster.json',
    });
  });

  it('does not treat a stranger NFT as this listing', () => {
    expect(
      listingMatchesOnchain('SwapMaster', {
        kind: 'record',
        record: { name: 'SomeoneElse' },
      }),
    ).toBe(false);
    expect(
      listingMatchesOnchain('SwapMaster', {
        kind: 'record',
        record: { name: 'SwapMaster' },
      }),
    ).toBe(true);
  });
});
