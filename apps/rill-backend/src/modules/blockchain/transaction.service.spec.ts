import { DROP_AFTER_MS, resolveReceipt } from './receipt';
import { TransactionService } from './transaction.service';
import type { ChainPublicClient } from './chain-client.provider';

const HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('TransactionService.pollRow', () => {
  it('resolves a submitted row from the receipt', async () => {
    const events = { append: jest.fn().mockResolvedValue({ seq: 1, eventId: 'e' }) };
    const updates: Array<Record<string, unknown>> = [];
    const db = {
      query: {
        transactions: { findMany: async () => [] },
      },
      insert: () => ({
        values: () => ({
          returning: async () => [
            { id: 'tx-1', status: 'submitted', txHash: HASH },
          ],
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values);
          return { where: () => Promise.resolve([]) };
        },
      }),
    };
    const client: ChainPublicClient = {
      readContract: async () => {
        throw new Error('unused');
      },
      getBlockNumber: async () => 20n,
      getTransactionReceipt: async () =>
        ({
          status: 'success' as const,
          blockNumber: 19n,
          gasUsed: 21_000n,
          effectiveGasPrice: 1n,
        }) as never,
      getLogs: async () => [],
    };
    const config = { get: () => 56 };
    const service = new TransactionService(
      db as never,
      config as never,
      client,
      events as never,
    );

    const status = await service.pollRow({
      id: 'tx-1',
      status: 'submitted',
      txHash: HASH,
      userOpHash: null,
      submittedAt: new Date(),
      confirmedAt: null,
      blockNumber: null,
      gasUsed: null,
      effectiveGasPriceWei: null,
      feeWei: null,
      revertReason: null,
    } as never);

    expect(status).toBe('succeeded');
    expect(updates[0]?.status).toBe('succeeded');
    expect(updates[0]?.blockNumber).toBe(19);
    expect(events.append).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transaction.succeeded', actorKind: 'chain' }),
    );
    expect(resolveReceipt(null, 1).status).toBe('submitted');
    expect(DROP_AFTER_MS).toBeGreaterThan(0);
  });
});
