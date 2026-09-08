import { listingMatchesOnchain } from './erc8004-codec';
import { AgentIdentityService } from './agent-identity.service';

describe('AgentIdentityService.applyLiveRead', () => {
  it('updates owner always, and pointers only when the on-chain name matches', async () => {
    const existing = {
      agentId: 'agent-1',
      onchainAgentId: '1',
      agentDomain: 'swapmaster.rill.local',
      endpointUrl: null,
    };
    const updated = { ...existing, ownerAddress: '0xabc', lastSyncBlock: 99 };
    const db = {
      query: {
        agentIdentities: {
          findFirst: () => Promise.resolve(existing),
        },
      },
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => ({
            returning: () => Promise.resolve([{ ...existing, ...values }]),
          }),
        }),
      }),
    };
    const events = { append: jest.fn() };
    const service = new AgentIdentityService(db as never, events as never);

    const stranger = await service.applyLiveRead({
      agentId: 'agent-1',
      listingName: 'SwapMaster',
      registryAddress: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
      chainId: 56,
      live: {
        owner: '0x1111111111111111111111111111111111111111',
        uri: 'data:application/json;base64,e30=',
        block: 99,
        decoded: { kind: 'record', record: { name: 'NotUs' } },
      },
    });

    expect(stranger.listingMatchesOnchain).toBe(false);
    expect(stranger.row.agentDomain).toBe('swapmaster.rill.local');
    expect(stranger.row.ownerAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(updated.lastSyncBlock).toBe(99);
    expect(listingMatchesOnchain('SwapMaster', { kind: 'https', url: 'https://x' })).toBe(
      false,
    );
  });
});
