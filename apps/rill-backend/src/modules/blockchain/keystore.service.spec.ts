import { KeystoreService } from './keystore.service';
import type { ChainPublicClient } from './chain-client.provider';

const USER = '0xAABBCCDDEEFF00112233445566778899AABBCCDD';
const KEY =
  '0x1111111111111111111111111111111111111111111111111111111111111111';
const KEYSTORE = '0x6572427ed530badcf7375cf9a4709d8d2b0e7e0a';

describe('KeystoreService', () => {
  it('reads isValidKey and persists onchainValid onto matching grants', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const client: ChainPublicClient = {
      readContract: (async ({ functionName }: { functionName: string }) => {
        if (functionName === 'isValidKey') return true;
        throw new Error(functionName);
      }) as ChainPublicClient['readContract'],
      getBlockNumber: async () => 1_234n,
      getTransactionReceipt: async () => {
        throw new Error('unused');
      },
      getLogs: async () => [],
    };
    const db = {
      update: () => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values);
          return { where: () => Promise.resolve([]) };
        },
      }),
    };
    const config = {
      get: (key: string) => (key === 'altana.keyStore' ? KEYSTORE : 56),
    };

    const service = new KeystoreService(
      db as never,
      config as never,
      client,
    );
    const live = await service.isValidKey(USER, KEY);

    expect(live.valid).toBe(true);
    expect(live.user).toBe(USER.toLowerCase());
    expect(live.keyId).toBe(KEY);
    expect(live.block).toBe(1234);
    expect(updates[0]?.onchainValid).toBe(true);
  });
});
