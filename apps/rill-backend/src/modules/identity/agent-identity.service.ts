import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { agentIdentities } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import {
  endpointFromRecord,
  listingMatchesOnchain,
  type DecodedAgentUri,
} from './erc8004-codec';
import type { LiveIdentityRead } from './erc8004-registry.service';

export type AttachCachedIdentityInput = {
  agentId: string;
  chainId: number;
  registryAddress: string;
  onchainAgentId: string;
  agentDomain?: string | null;
  endpointUrl?: string | null;
  ownerAddress?: string | null;
};

export type ApplyLiveReadInput = {
  agentId: string;
  listingName: string;
  live: LiveIdentityRead;
  registryAddress: string;
  chainId: number;
  onchainAgentId?: string;
};

/**
 * Cached ERC-8004 row for a listing. Identity is on-chain and canonical; this table is a
 * read-through cache stamped with the block it was last read at. Discovery may serve it stale.
 * Commerce must re-read the registry — this service does not pretend the cache is live.
 */
@Injectable()
export class AgentIdentityService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly events: EventStoreService,
  ) {}

  getByAgentId(agentId: string) {
    return this.db.query.agentIdentities.findFirst({
      where: eq(agentIdentities.agentId, agentId),
    });
  }

  async attachCache(input: AttachCachedIdentityInput) {
    const existing = await this.getByAgentId(input.agentId);
    if (existing) {
      return existing;
    }

    const [row] = await this.db
      .insert(agentIdentities)
      .values({
        agentId: input.agentId,
        chainId: input.chainId,
        registryAddress: input.registryAddress.toLowerCase(),
        onchainAgentId: input.onchainAgentId,
        agentDomain: input.agentDomain ?? null,
        endpointUrl: input.endpointUrl ?? null,
        ownerAddress: input.ownerAddress?.toLowerCase() ?? null,
        lastSyncBlock: 0,
        lastSyncedAt: new Date(),
      })
      .onConflictDoNothing({ target: agentIdentities.agentId })
      .returning();

    const attached = row ?? (await this.getByAgentId(input.agentId));
    if (!attached) {
      throw new Error('Failed to attach agent identity');
    }

    await this.events.append({
      type: 'agent.identity_attached',
      subjectType: 'agent',
      subjectId: input.agentId,
      actorKind: 'system',
      payload: {
        chainId: input.chainId,
        onchainAgentId: input.onchainAgentId,
      },
    });

    return attached;
  }

  /**
   * Write a live registry read into the cache. Owner and sync watermark always update.
   * Domain / endpoint only update when the on-chain record names this listing — token id 1
   * on a shared registry is not automatically SwapMaster.
   */
  async applyLiveRead(input: ApplyLiveReadInput) {
    const existing = await this.getByAgentId(input.agentId);
    if (!existing) {
      throw new NotFoundException('Agent has no identity cache to sync');
    }

    const matches = listingMatchesOnchain(input.listingName, input.live.decoded);
    const pointers = matches
      ? pointersFromDecoded(input.live.decoded)
      : { agentDomain: existing.agentDomain, endpointUrl: existing.endpointUrl };

    const [updated] = await this.db
      .update(agentIdentities)
      .set({
        chainId: input.chainId,
        registryAddress: input.registryAddress.toLowerCase(),
        onchainAgentId: input.onchainAgentId ?? existing.onchainAgentId,
        ownerAddress: input.live.owner,
        agentDomain: pointers.agentDomain,
        endpointUrl: pointers.endpointUrl,
        lastSyncBlock: input.live.block,
        lastSyncedAt: new Date(),
      })
      .where(eq(agentIdentities.agentId, input.agentId))
      .returning();

    await this.events.append({
      type: 'agent.identity_synced',
      subjectType: 'agent',
      subjectId: input.agentId,
      actorKind: 'system',
      payload: {
        onchainAgentId: updated.onchainAgentId,
        block: input.live.block,
        listingMatchesOnchain: matches,
      },
    });

    return { row: updated, listingMatchesOnchain: matches };
  }
}

export { listingMatchesOnchain };

function pointersFromDecoded(decoded: DecodedAgentUri): {
  agentDomain: string | null;
  endpointUrl: string | null;
} {
  if (decoded.kind === 'https') {
    try {
      const url = new URL(decoded.url);
      return { agentDomain: url.host, endpointUrl: decoded.url };
    } catch {
      return { agentDomain: null, endpointUrl: decoded.url };
    }
  }

  if (decoded.kind === 'record') {
    return {
      agentDomain: null,
      endpointUrl: endpointFromRecord(decoded.record),
    };
  }

  return { agentDomain: null, endpointUrl: null };
}
