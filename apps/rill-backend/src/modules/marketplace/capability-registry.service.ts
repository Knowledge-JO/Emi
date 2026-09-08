import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  capabilities,
  capabilityAssets,
  capabilityProtocols,
} from '../../database/schema';
import { EmbeddingModel } from '../ai/embedding-model';
import { EventStoreService } from '../events/event-store.service';

export type DeclareCapabilityInput = {
  agentId: string;
  name: string;
  taxonomyKey: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  pricingModel: 'per_job' | 'per_request' | 'subscription';
  settlementRail: 'x402' | 'erc8183';
  unitPrice: string;
  priceAssetId: string;
  assetIds: string[];
  protocolIds: string[];
  expectedDurationSeconds?: number | null;
  x402ResourceUrl?: string | null;
  x402Method?: string | null;
  maxConcurrency?: number;
};

export function capabilityEmbedText(input: {
  name: string;
  taxonomyKey: string;
  description: string;
}): string {
  return `${input.taxonomyKey}\n${input.name}\n${input.description}`;
}

/**
 * Step 3: the actual marketplace object. An agent does not claim "I am a DeFi agent"; it declares
 * a machine contract — taxonomy key, I/O schema, assets, protocols, one price, one rail.
 *
 * Embedding happens here, as a document, so discovery can fall back to pgvector when no exact
 * `taxonomy_key` hit exists. Seeded listings skip this call; exact match does not need a vector.
 */
@Injectable()
export class CapabilityRegistryService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly embeddings: EmbeddingModel,
    private readonly events: EventStoreService,
  ) {}

  listByAgent(agentId: string) {
    return this.db.query.capabilities.findMany({
      where: eq(capabilities.agentId, agentId),
    });
  }

  async declare(input: DeclareCapabilityInput) {
    assertRailMatchesPricing(input);

    const [row] = await this.db
      .insert(capabilities)
      .values({
        agentId: input.agentId,
        name: input.name,
        taxonomyKey: input.taxonomyKey,
        description: input.description,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        pricingModel: input.pricingModel,
        settlementRail: input.settlementRail,
        unitPrice: input.unitPrice,
        priceAssetId: input.priceAssetId,
        x402ResourceUrl: input.x402ResourceUrl ?? null,
        x402Method: input.x402Method ?? 'GET',
        maxConcurrency: input.maxConcurrency ?? 1,
        expectedDurationSeconds: input.expectedDurationSeconds ?? null,
        status: 'active',
      })
      .returning();

    if (input.assetIds.length > 0) {
      await this.db.insert(capabilityAssets).values(
        input.assetIds.map((assetId) => ({
          capabilityId: row.id,
          assetId,
        })),
      );
    }

    if (input.protocolIds.length > 0) {
      await this.db.insert(capabilityProtocols).values(
        input.protocolIds.map((protocolId) => ({
          capabilityId: row.id,
          protocolId,
        })),
      );
    }

    await this.embedCapability(row);

    await this.events.append({
      type: 'capability.declared',
      subjectType: 'capability',
      subjectId: row.id,
      actorKind: 'platform',
      payload: {
        agentId: input.agentId,
        taxonomyKey: input.taxonomyKey,
        settlementRail: input.settlementRail,
      },
    });

    return row;
  }

  async embedMissingForAgent(agentId: string): Promise<void> {
    const rows = await this.listByAgent(agentId);
    for (const row of rows) {
      if (!row.embedding) {
        await this.embedCapability(row);
      }
    }
  }

  private async embedCapability(row: typeof capabilities.$inferSelect) {
    const embedding = await this.embeddings.embed(
      capabilityEmbedText(row),
      'document',
    );

    await this.db
      .update(capabilities)
      .set({ embedding })
      .where(eq(capabilities.id, row.id));
  }
}

function assertRailMatchesPricing(input: DeclareCapabilityInput): void {
  if (input.pricingModel === 'per_request' && input.settlementRail !== 'x402') {
    throw new BadRequestException('per_request capabilities settle over x402');
  }
  if (input.pricingModel === 'per_job' && input.settlementRail !== 'erc8183') {
    throw new BadRequestException('per_job capabilities settle over ERC-8183');
  }
  if (input.settlementRail === 'x402' && !input.x402ResourceUrl) {
    throw new BadRequestException(
      'x402 capabilities need a resource URL for the payment challenge',
    );
  }
}
