import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  intents,
  type CapabilityGraphNode,
  type ParsedIntent,
} from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import type { MatchedAgent } from '../marketplace/matching.types';
import { MarketplaceMatchingService } from '../marketplace/marketplace-matching.service';
import { CatalogService } from '../marketplace/catalog.service';
import { CapabilityGraphService } from './capability-graph.service';
import { IntentParserService } from './intent-parser.service';
import { IntentPlannerService } from './intent-planner.service';

export type IntentResponse = {
  id: string;
  status: (typeof intents.$inferSelect)['status'];
  rawText: string;
  intent: ParsedIntent;
  capabilityGraph: CapabilityGraphNode[];
  matches: MatchedAgent[];
  unmatchedTaxonomyKeys: string[];
  embeddingDimensions: number;
  planner: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
  createdAt: string;
};

/**
 * Intent lifecycle. This module resolves *what must happen*, then asks the marketplace who can
 * do it. It never signs. Persistence is the raw message plus the validated object, so a newer
 * parser can replay; recommendations are marketplace rows, not planner output.
 */
@Injectable()
export class IntentService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly parser: IntentParserService,
    private readonly graph: CapabilityGraphService,
    private readonly planner: IntentPlannerService,
    private readonly catalog: CatalogService,
    private readonly matching: MarketplaceMatchingService,
    private readonly events: EventStoreService,
  ) {}

  async createFromMessage(
    userId: string,
    rawText: string,
  ): Promise<IntentResponse> {
    const parsed = await this.parser.parse(rawText);
    const available = await this.catalog.listActiveTaxonomyKeys();
    const planned = await this.planner.plan(parsed.intent, available);
    const capabilityGraph =
      planned.graph.length > 0
        ? planned.graph
        : this.graph.plan(parsed.intent, available);

    const [row] = await this.db
      .insert(intents)
      .values({
        userId,
        rawText,
        status: 'parsed',
        goalTree: parsed.intent,
        capabilityGraph,
        plannerModel: parsed.model,
        plannerPromptTokens: parsed.promptTokens,
        plannerCompletionTokens: parsed.completionTokens,
        plannerLatencyMs: parsed.latencyMs,
        parsedAt: new Date(),
      })
      .returning();

    await this.events.append({
      type: 'intent.parsed',
      subjectType: 'intent',
      subjectId: row.id,
      actorKind: 'user',
      actorId: userId,
      correlationId: row.id,
      payload: {
        kind: parsed.intent.kind,
        chain: parsed.intent.chain,
        model: parsed.model,
      },
    });

    const { matches, unmatchedTaxonomyKeys } = await this.matching.matchIntent({
      intentId: row.id,
      userId,
      graph: capabilityGraph,
      queryEmbedding: parsed.embedding,
    });

    const [resolved] = await this.db
      .update(intents)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(eq(intents.id, row.id))
      .returning();

    await this.events.append({
      type: 'intent.resolved',
      subjectType: 'intent',
      subjectId: row.id,
      actorKind: 'system',
      actorId: userId,
      correlationId: row.id,
      payload: {
        matchCount: matches.length,
        unmatchedTaxonomyKeys,
      },
    });

    return this.toResponse(
      resolved ?? row,
      parsed.embedding.length,
      matches,
      unmatchedTaxonomyKeys,
    );
  }

  async getForUser(userId: string, id: string) {
    const row = await this.db.query.intents.findFirst({
      where: eq(intents.id, id),
    });

    if (!row || row.userId !== userId || !row.goalTree) {
      return null;
    }

    const matches = await this.matching.listForIntent(id);
    const unmatchedTaxonomyKeys = (row.capabilityGraph ?? [])
      .map((node) => node.taxonomyKey)
      .filter(
        (key) => !matches.some((match) => match.requestedTaxonomyKey === key),
      );

    return this.toResponse(row, 0, matches, unmatchedTaxonomyKeys);
  }

  private toResponse(
    row: typeof intents.$inferSelect,
    embeddingDimensions: number,
    matches: MatchedAgent[],
    unmatchedTaxonomyKeys: string[],
  ): IntentResponse {
    return {
      id: row.id,
      status: row.status,
      rawText: row.rawText,
      intent: row.goalTree as ParsedIntent,
      capabilityGraph: row.capabilityGraph ?? [],
      matches,
      unmatchedTaxonomyKeys,
      embeddingDimensions,
      planner: {
        model: row.plannerModel ?? '',
        promptTokens: row.plannerPromptTokens ?? 0,
        completionTokens: row.plannerCompletionTokens ?? 0,
        latencyMs: row.plannerLatencyMs ?? 0,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }
}
