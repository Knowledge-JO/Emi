import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { ChainPublicClient } from '../src/modules/blockchain/chain-client.provider';
import { createTestApp } from './test-app';

const USER = '0xaabbccddeeff00112233445566778899aabbccdd';
const KEY =
  '0x1111111111111111111111111111111111111111111111111111111111111111';

describe('Chain (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const chainClient: ChainPublicClient = {
      chain: { id: 56 },
      readContract: (async ({ functionName }: { functionName: string }) => {
        if (functionName === 'isValidKey') return true;
        if (functionName === 'getKeys') {
          return [KEY];
        }
        throw new Error(functionName);
      }) as ChainPublicClient['readContract'],
      getBlockNumber: async () => 42n,
      getTransactionReceipt: async () => {
        throw new Error('unused');
      },
      getLogs: async () => [],
    };
    app = await createTestApp({ chainClient });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers isValidKey without a Privy session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/chain/keystore/${USER}/${KEY}`)
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.user).toBe(USER);
    expect(res.body.keyId).toBe(KEY);
    expect(res.body.block).toBe(42);
    expect(res.body.chainId).toBe(56);
  });

  it('lists getKeys for a wallet', async () => {
    const res = await request(app.getHttpServer())
      .get(`/chain/keystore/${USER}/keys`)
      .expect(200);

    expect(res.body.keyIds).toEqual([KEY]);
  });

  it('rejects a malformed address', async () => {
    await request(app.getHttpServer())
      .get(`/chain/keystore/not-an-address/${KEY}`)
      .expect(400);
  });
});
