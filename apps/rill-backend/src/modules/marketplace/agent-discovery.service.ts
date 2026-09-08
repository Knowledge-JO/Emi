import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { CHAIN_IDS } from '../../database/seed/ids';
import {
  EMBEDDING_DIMENSIONS,
  agents,
  capabilities,
  capabilityAssets,
  type CapabilityGraphNode,
} from '../../database/schema';
import { CatalogService } from './catalog.service';

export type DiscoveredCandidate = {
  agent: typeof agents.$inferSelect;
  capability: typeof capabilities.$inferSelect;
  match: 'exact' | 'vector';
  fit: number;
};

/**
 * Step 5a: find candidates for one capability-graph node.
 *
 * Exact `taxonomy_key` first, with asset coverage required. Vector similarity only if that set
 * is empty — a semantic "kinda swap" must never beat an agent that actually declared `defi.swap`.
 * Unknown symbols fail closed: if USDT is not in the catalog, nothing matches.
 */
@Injectable()
export class AgentDiscoveryService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly catalog: CatalogService,
    @Inject(ConfigService) private readonly config: RillConfigService,
  ) {}

  async findForNode(
    node: CapabilityGraphNode,
    queryEmbedding?: number[],
  ): Promise<DiscoveredCandidate[]> {
    const chainId = chainIdFor(node, this.config);
    const symbols = symbolsFrom(node);
    const requiredAssetIds = await this.resolveRequiredAssets(chainId, symbols);
    if (requiredAssetIds === null) {
      return [];
    }

    const exact = await this.loadByTaxonomy(node.taxonomyKey);
    const covered = await this.withRequiredAssets(exact, requiredAssetIds);
    if (covered.length > 0) {
      return covered.map((row) => ({
        ...row,
        match: 'exact' as const,
        fit: 1,
      }));
    }

    if (!queryEmbedding || queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
      return [];
    }

    const semantic = await this.loadByEmbedding(queryEmbedding);
    const fallback = await this.withRequiredAssets(semantic, requiredAssetIds);
    return fallback.map((row) => ({
      agent: row.agent,
      capability: row.capability,
      match: 'vector' as const,
      fit: row.fit,
    }));
  }

  /**
   * `null` means a named symbol is missing from the catalog — do not match anything.
   * An empty array means the node named no assets, so asset coverage is not a filter.
   */
  private async resolveRequiredAssets(
    chainId: number,
    symbols: string[],
  ): Promise<string[] | null> {
    if (symbols.length === 0) {
      return [];
    }

    const { wanted, rows } = await this.catalog.findAssetsBySymbols(
      chainId,
      symbols,
    );
    if (rows.length !== wanted.length) {
      return null;
    }
    return rows.map((row) => row.id);
  }

  private async loadByTaxonomy(taxonomyKey: string) {
    return this.db
      .select({ capability: capabilities, agent: agents })
      .from(capabilities)
      .innerJoin(agents, eq(agents.id, capabilities.agentId))
      .where(
        and(
          eq(capabilities.taxonomyKey, taxonomyKey),
          eq(capabilities.status, 'active'),
          eq(agents.status, 'active'),
        ),
      );
  }

  private async loadByEmbedding(embedding: number[]) {
    const distance = sql<number>`(${capabilities.embedding} <=> ${vectorLiteral(embedding)})`;

    const rows = await this.db
      .select({
        capability: capabilities,
        agent: agents,
        distance,
      })
      .from(capabilities)
      .innerJoin(agents, eq(agents.id, capabilities.agentId))
      .where(
        and(
          eq(capabilities.status, 'active'),
          eq(agents.status, 'active'),
          sql`${capabilities.embedding} is not null`,
        ),
      )
      .orderBy(distance)
      .limit(24);

    return rows.map((row) => ({
      capability: row.capability,
      agent: row.agent,
      fit: clamp01(1 - row.distance),
    }));
  }

  private async withRequiredAssets<
    T extends {
      capability: typeof capabilities.$inferSelect;
      agent: typeof agents.$inferSelect;
    },
  >(rows: T[], requiredAssetIds: string[]): Promise<T[]> {
    if (requiredAssetIds.length === 0 || rows.length === 0) {
      return rows;
    }

    const capIds = rows.map((row) => row.capability.id);
    const links = await this.db
      .select()
      .from(capabilityAssets)
      .where(inArray(capabilityAssets.capabilityId, capIds));

    const have = new Map<string, Set<string>>();
    for (const link of links) {
      const set = have.get(link.capabilityId) ?? new Set<string>();
      set.add(link.assetId);
      have.set(link.capabilityId, set);
    }

    return rows.filter((row) => {
      const assets = have.get(row.capability.id);
      if (!assets) return false;
      return requiredAssetIds.every((id) => assets.has(id));
    });
  }
}

function symbolsFrom(node: CapabilityGraphNode): string[] {
  const input = node.input ?? {};
  return [input.fromSymbol, input.toSymbol].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

function chainIdFor(
  node: CapabilityGraphNode,
  config: RillConfigService,
): number {
  const chain = node.input?.chain;
  if (chain === 'bnb' || chain === 'bnb-testnet' || chain === 'ethereum') {
    return CHAIN_IDS[chain];
  }
  return config.get('chain.chainId', { infer: true });
}

function vectorLiteral(embedding: number[]) {
  const body = embedding.map((value) => Number(value)).join(',');
  return sql.raw(`'[${body}]'::vector`);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
