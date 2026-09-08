import { IndexerService } from './indexer.service';
import type { ChainPublicClient } from './chain-client.provider';

describe('IndexerService.tick', () => {
  it('re-reads known identities, jobs and keys and advances the cursor once', async () => {
    const identityUpdates: Array<Record<string, unknown>> = [];
    const jobUpdates: Array<Record<string, unknown>> = [];
    const cursors: Array<{ name: string; lastBlock: number }> = [];
    const events = { append: jest.fn().mockResolvedValue({ seq: 1 }) };
    const keystore = {
      isValidKey: jest.fn().mockResolvedValue({ valid: false }),
    };

    const identities = [
      {
        id: 'ident-1',
        agentId: 'agent-1',
        chainId: 56,
        registryAddress: '0x3333333333333333333333333333333333333333',
        onchainAgentId: '1',
        ownerAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        lastSyncBlock: 0,
      },
    ];
    const jobRows = [
      {
        id: 'job-1',
        chainId: 56,
        escrowAddress: '0x2222222222222222222222222222222222222222',
        onchainJobId: '7',
        status: 'created',
        fundedAt: null,
        deliveredAt: null,
        settledAt: null,
      },
    ];
    const grants = [
      {
        id: 'auth-1',
        chainId: 56,
        walletId: 'wallet-1',
        keyId: '0x1111111111111111111111111111111111111111111111111111111111111111',
        onchainValid: true,
      },
    ];

    const db = {
      query: {
        indexerCursors: {
          findFirst: () => Promise.resolve(undefined),
        },
        agentIdentities: {
          findMany: () => Promise.resolve(identities),
        },
        jobs: {
          findMany: () => Promise.resolve(jobRows),
        },
        authorizations: {
          findMany: () => Promise.resolve(grants),
        },
        wallets: {
          findFirst: () =>
            Promise.resolve({
              id: 'wallet-1',
              address: '0xaabbccddeeff00112233445566778899aabbccdd',
            }),
        },
      },
      update: (table: { name?: string }) => ({
        set: (values: Record<string, unknown>) => ({
          where: () => {
            if ('onchainAgentId' in (identities[0] ?? {}) && values.ownerAddress) {
              identityUpdates.push(values);
            } else if (values.status) {
              jobUpdates.push(values);
            } else if (typeof values.lastBlock === 'number') {
              cursors.push({ name: 'cursor', lastBlock: values.lastBlock as number });
            }
            return Promise.resolve([]);
          },
        }),
      }),
      insert: () => ({
        values: (values: { name: string; lastBlock: number }) => {
          cursors.push(values);
          return Promise.resolve([]);
        },
      }),
    };

    const client: ChainPublicClient = {
      readContract: (async ({ functionName }: { functionName: string }) => {
        if (functionName === 'ownerOf') {
          return '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        }
        if (functionName === 'getJob') {
          return {
            id: 7n,
            status: 1,
            client: '0x1',
            provider: '0x2',
            evaluator: '0x3',
            description: 'x',
            budget: 1n,
            expiredAt: 1n,
            hook: '0x4',
            submittedAt: 0n,
            deliverable: '0x00',
          };
        }
        throw new Error(functionName);
      }) as ChainPublicClient['readContract'],
      getBlockNumber: async () => 1_000n,
      getTransactionReceipt: async () => {
        throw new Error('unused');
      },
      getLogs: async () => [],
    };
    const config = { get: () => 56 };

    const service = new IndexerService(
      db as never,
      config as never,
      client,
      keystore as never,
      events as never,
    );

    const result = await service.tick();

    expect(result.finalizedHead).toBe(992);
    expect(result.identities).toBe(1);
    expect(identityUpdates[0]?.ownerAddress).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    expect(jobUpdates[0]?.status).toBe('funded');
    expect(keystore.isValidKey).toHaveBeenCalled();
    expect(cursors.map((row) => row.name).sort()).toEqual([
      'erc8004',
      'erc8183',
      'keystore',
    ]);
    expect(events.append).toHaveBeenCalled();
  });

  it('re-applies the reorg window when the cursor is already at the safe head', async () => {
    const db = {
      query: {
        indexerCursors: {
          findFirst: () => Promise.resolve({ id: 'c', lastBlock: 992 }),
        },
        agentIdentities: {
          findMany: () => Promise.resolve([]),
        },
        jobs: {
          findMany: () => Promise.resolve([]),
        },
        authorizations: {
          findMany: () => Promise.resolve([]),
        },
      },
      update: () => ({
        set: () => ({ where: () => Promise.resolve([]) }),
      }),
    };
    const client: ChainPublicClient = {
      readContract: async () => {
        throw new Error('should not read');
      },
      getBlockNumber: async () => 1_000n,
      getTransactionReceipt: async () => {
        throw new Error('unused');
      },
      getLogs: async () => [],
    };

    const service = new IndexerService(
      db as never,
      { get: () => 56 } as never,
      client,
      { isValidKey: jest.fn() } as never,
      { append: jest.fn() } as never,
    );

    await expect(service.tick()).resolves.toMatchObject({
      identities: 0,
      jobs: 0,
      keys: 0,
      finalizedHead: 992,
    });
  });
});
