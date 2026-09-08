import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { Hex } from 'viem';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  agentIdentities,
  authorizations,
  indexerCursors,
  jobs,
  wallets,
} from '../../database/schema';
import { ERC8183_COMMERCE_ABI } from '../commerce/erc8183/erc8183-abi';
import { statusName } from '../commerce/erc8183/erc8183-read';
import { mirrorLocalStatus } from '../commerce/erc8183/job-status';
import { EventStoreService } from '../events/event-store.service';
import { ERC8004_REGISTRY_ABI } from '../identity/erc8004-abi';
import { CHAIN_PUBLIC_CLIENT, type ChainPublicClient } from './chain-client.provider';
import { nextIndexRange, safeHead, shouldAdvanceCursor } from './cursor';
import { KeystoreService } from './keystore.service';

export const INDEXER_FEEDS = ['erc8004', 'erc8183', 'keystore'] as const;
export type IndexerFeed = (typeof INDEXER_FEEDS)[number];

export type IndexerTickResult = {
  chainId: number;
  head: number;
  finalizedHead: number;
  identities: number;
  jobs: number;
  keys: number;
};

/**
 * Re-read the chain into cache tables from a persisted block cursor. Identity, jobs and
 * authorizations stay caches: commerce and execute still live-read when they spend.
 * Tests never tick — `NODE_ENV=test` skips the cron, same as the outbox.
 */
@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
    private readonly keystore: KeystoreService,
    private readonly events: EventStoreService,
  ) {}

  @Cron('*/20 * * * * *')
  async scheduledTick(): Promise<void> {
    if (this.config.get('app.env', { infer: true }) === 'test') return;
    try {
      await this.tick();
    } catch (error) {
      this.logger.warn(
        `indexer tick failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async tick(): Promise<IndexerTickResult> {
    const chainId = this.config.get('altana.chainId', { infer: true });
    const head = Number(await this.client.getBlockNumber());
    const finalizedHead = safeHead(head);

    const identities = await this.refreshIdentities(chainId, finalizedHead);
    const jobCount = await this.refreshJobs(chainId, finalizedHead);
    const keys = await this.refreshKeys(chainId, finalizedHead);

    return {
      chainId,
      head,
      finalizedHead,
      identities,
      jobs: jobCount,
      keys,
    };
  }

  private async refreshIdentities(chainId: number, finalizedHead: number) {
    const cursor = await this.loadCursor(chainId, 'erc8004');
    const range = nextIndexRange(cursor, finalizedHead);
    if (!range) {
      return 0;
    }

    const rows = await this.db.query.agentIdentities.findMany({
      where: eq(agentIdentities.chainId, chainId),
    });

    let updated = 0;
    for (const row of rows) {
      try {
        const owner = await this.client.readContract({
          address: row.registryAddress as Hex,
          abi: ERC8004_REGISTRY_ABI,
          functionName: 'ownerOf',
          args: [BigInt(row.onchainAgentId)],
        });
        const ownerAddress = owner.toLowerCase();
        const changed = ownerAddress !== (row.ownerAddress ?? '');
        if (!changed && row.lastSyncBlock === range.to) {
          continue;
        }
        await this.db
          .update(agentIdentities)
          .set({
            ownerAddress,
            lastSyncBlock: range.to,
            lastSyncedAt: new Date(),
          })
          .where(eq(agentIdentities.id, row.id));
        updated += 1;
        if (changed) {
          await this.events.append({
            type: 'agent.identity_synced',
            subjectType: 'agent',
            subjectId: row.agentId,
            actorKind: 'chain',
            payload: {
              onchainAgentId: row.onchainAgentId,
              block: range.to,
              source: 'indexer',
            },
          });
        }
      } catch (error) {
        this.logger.warn(
          `identity ${row.onchainAgentId} sync failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    await this.saveCursor(chainId, 'erc8004', range.to);
    return updated;
  }

  private async refreshJobs(chainId: number, finalizedHead: number) {
    const cursor = await this.loadCursor(chainId, 'erc8183');
    const range = nextIndexRange(cursor, finalizedHead);
    if (!range) {
      return 0;
    }

    const rows = await this.db.query.jobs.findMany({
      where: and(eq(jobs.chainId, chainId), isNotNull(jobs.onchainJobId)),
    });

    let updated = 0;
    for (const row of rows) {
      if (!row.onchainJobId) continue;
      try {
        const live = await this.client.readContract({
          address: row.escrowAddress as Hex,
          abi: ERC8183_COMMERCE_ABI,
          functionName: 'getJob',
          args: [BigInt(row.onchainJobId)],
        });
        const onchain = statusName(live.status);
        const status = mirrorLocalStatus(onchain, row.status);
        if (status === row.status) {
          continue;
        }
        await this.db
          .update(jobs)
          .set({
            status,
            fundedAt:
              onchain === 'OPEN' ? row.fundedAt : (row.fundedAt ?? new Date()),
            deliveredAt:
              onchain === 'SUBMITTED' || onchain === 'COMPLETED'
                ? (row.deliveredAt ?? new Date())
                : row.deliveredAt,
            settledAt:
              onchain === 'COMPLETED' ? (row.settledAt ?? new Date()) : row.settledAt,
          })
          .where(eq(jobs.id, row.id));
        updated += 1;
        await this.events.append({
          type: 'job.synced',
          subjectType: 'job',
          subjectId: row.id,
          actorKind: 'chain',
          payload: { status, onchain, block: range.to, source: 'indexer' },
        });
      } catch (error) {
        this.logger.warn(
          `job ${row.id} sync failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    await this.saveCursor(chainId, 'erc8183', range.to);
    return updated;
  }

  private async refreshKeys(chainId: number, finalizedHead: number) {
    const cursor = await this.loadCursor(chainId, 'keystore');
    const range = nextIndexRange(cursor, finalizedHead);
    if (!range) {
      return 0;
    }

    const rows = await this.db.query.authorizations.findMany({
      where: eq(authorizations.chainId, chainId),
    });

    let updated = 0;
    for (const row of rows) {
      const wallet = await this.db.query.wallets.findFirst({
        where: eq(wallets.id, row.walletId),
      });
      if (!wallet) continue;
      try {
        const live = await this.keystore.isValidKey(wallet.address, row.keyId);
        if (live.valid !== row.onchainValid) {
          updated += 1;
        }
      } catch (error) {
        this.logger.warn(
          `key ${row.keyId} verify failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    await this.saveCursor(chainId, 'keystore', range.to);
    return updated;
  }

  private async loadCursor(chainId: number, name: IndexerFeed): Promise<number> {
    const row = await this.db.query.indexerCursors.findFirst({
      where: and(
        eq(indexerCursors.chainId, chainId),
        eq(indexerCursors.name, name),
      ),
    });
    return row?.lastBlock ?? 0;
  }

  private async saveCursor(
    chainId: number,
    name: IndexerFeed,
    lastBlock: number,
  ): Promise<void> {
    const existing = await this.db.query.indexerCursors.findFirst({
      where: and(
        eq(indexerCursors.chainId, chainId),
        eq(indexerCursors.name, name),
      ),
    });
    if (existing) {
      if (!shouldAdvanceCursor(existing.lastBlock, lastBlock)) {
        return;
      }
      await this.db
        .update(indexerCursors)
        .set({ lastBlock })
        .where(eq(indexerCursors.id, existing.id));
      return;
    }
    await this.db.insert(indexerCursors).values({ chainId, name, lastBlock });
  }
}
