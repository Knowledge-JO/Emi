import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray } from 'drizzle-orm';
import type { Hex } from 'viem';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { transactions } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import { CHAIN_PUBLIC_CLIENT, type ChainPublicClient } from './chain-client.provider';
import { resolveReceipt, shouldDrop } from './receipt';

type TxStatus = (typeof transactions.$inferSelect)['status'];
type TxKind = (typeof transactions.$inferSelect)['kind'];

export type RecordTransactionInput = {
  walletId?: string | null;
  sessionId?: string | null;
  workflowStepId?: string | null;
  jobId?: string | null;
  protocolId?: string | null;
  chainId: number;
  kind?: TxKind;
  status: TxStatus;
  fromAddress: string;
  toAddress?: string | null;
  userOpHash?: string | null;
  txHash?: string | null;
  calls?: Array<{ to: string; selector?: string; value?: string }> | null;
  submittedAt?: Date | null;
  confirmedAt?: Date | null;
  revertReason?: string | null;
};

const OPEN_STATUSES = ['pending', 'submitted', 'included'] as const;

/**
 * Every tx the platform originated: record it, poll for the receipt, resolve final status,
 * and keep the row linked to the workflow step that caused it.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
    private readonly events: EventStoreService,
  ) {}

  @Cron('*/15 * * * * *')
  async scheduledPoll(): Promise<void> {
    if (this.config.get('app.env', { infer: true }) === 'test') return;
    try {
      await this.pollPending();
    } catch (error) {
      this.logger.warn(
        `receipt poll failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async record(input: RecordTransactionInput) {
    const [row] = await this.db
      .insert(transactions)
      .values({
        walletId: input.walletId ?? null,
        sessionId: input.sessionId ?? null,
        workflowStepId: input.workflowStepId ?? null,
        jobId: input.jobId ?? null,
        protocolId: input.protocolId ?? null,
        chainId: input.chainId,
        kind: input.kind ?? 'user_op',
        status: input.status,
        fromAddress: input.fromAddress.toLowerCase(),
        toAddress: input.toAddress ? input.toAddress.toLowerCase() : null,
        userOpHash: input.userOpHash ? input.userOpHash.toLowerCase() : null,
        txHash: input.txHash ? input.txHash.toLowerCase() : null,
        calls: input.calls ?? null,
        submittedAt: input.submittedAt ?? new Date(),
        confirmedAt: input.confirmedAt ?? null,
        revertReason: input.revertReason ?? null,
      })
      .returning();

    await this.events.append({
      type: 'transaction.recorded',
      subjectType: 'transaction',
      subjectId: row.id,
      actorKind: 'system',
      payload: {
        status: row.status,
        txHash: row.txHash,
        userOpHash: row.userOpHash,
        workflowStepId: row.workflowStepId,
      },
    });

    return row;
  }

  async pollPending(): Promise<{ polled: number; resolved: number }> {
    const chainId = this.config.get('altana.chainId', { infer: true });
    const rows = await this.db.query.transactions.findMany({
      where: and(
        eq(transactions.chainId, chainId),
        inArray(transactions.status, [...OPEN_STATUSES]),
      ),
    });

    let resolved = 0;
    for (const row of rows) {
      const next = await this.pollRow(row);
      if (next && next !== row.status) {
        resolved += 1;
      }
    }
    return { polled: rows.length, resolved };
  }

  async pollRow(row: typeof transactions.$inferSelect) {
    if (!row.txHash) {
      if (
        (row.status === 'pending' || row.status === 'submitted') &&
        shouldDrop(row.submittedAt)
      ) {
        await this.mark(row, {
          status: 'dropped',
          revertReason: row.revertReason ?? 'no receipt before drop timeout',
        });
        return 'dropped';
      }
      return row.status;
    }

    const receipt = await this.readReceipt(row.txHash as Hex);
    const head = await this.client.getBlockNumber();
    const resolved = resolveReceipt(receipt, head);

    if (resolved.status === row.status && resolved.status === 'submitted') {
      if (shouldDrop(row.submittedAt)) {
        await this.mark(row, {
          status: 'dropped',
          revertReason: row.revertReason ?? 'no receipt before drop timeout',
        });
        return 'dropped';
      }
      return row.status;
    }

    if (resolved.status === row.status) {
      return row.status;
    }

    await this.mark(row, {
      status: resolved.status,
      blockNumber: resolved.blockNumber,
      gasUsed: resolved.gasUsed,
      effectiveGasPriceWei: resolved.effectiveGasPriceWei,
      confirmedAt:
        resolved.status === 'succeeded' || resolved.status === 'reverted'
          ? new Date()
          : row.confirmedAt,
    });
    return resolved.status;
  }

  private async readReceipt(hash: Hex) {
    try {
      return await this.client.getTransactionReceipt({ hash });
    } catch (error) {
      this.logger.debug(
        `no receipt yet for ${hash}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async mark(
    row: typeof transactions.$inferSelect,
    patch: {
      status: TxStatus;
      blockNumber?: number | null;
      gasUsed?: string | null;
      effectiveGasPriceWei?: string | null;
      confirmedAt?: Date | null;
      revertReason?: string | null;
    },
  ) {
    const feeWei =
      patch.gasUsed && patch.effectiveGasPriceWei
        ? (BigInt(patch.gasUsed) * BigInt(patch.effectiveGasPriceWei)).toString()
        : row.feeWei;

    await this.db
      .update(transactions)
      .set({
        status: patch.status,
        blockNumber: patch.blockNumber ?? row.blockNumber,
        gasUsed: patch.gasUsed ?? row.gasUsed,
        effectiveGasPriceWei:
          patch.effectiveGasPriceWei ?? row.effectiveGasPriceWei,
        feeWei,
        confirmedAt: patch.confirmedAt ?? row.confirmedAt,
        revertReason: patch.revertReason ?? row.revertReason,
      })
      .where(eq(transactions.id, row.id));

    await this.events.append({
      type: `transaction.${patch.status}`,
      subjectType: 'transaction',
      subjectId: row.id,
      actorKind: 'chain',
      payload: {
        txHash: row.txHash,
        userOpHash: row.userOpHash,
        blockNumber: patch.blockNumber ?? row.blockNumber,
      },
    });
  }
}
