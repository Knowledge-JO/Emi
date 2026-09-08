import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  agents,
  capabilities,
  recommendations,
  type CapabilityGraphNode,
} from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import { AgentAvailabilityService } from './agent-availability.service';
import { AgentDiscoveryService } from './agent-discovery.service';
import { AgentPricingService } from './agent-pricing.service';
import { AgentRankingService } from './agent-ranking.service';
import { AgentReputationService } from './agent-reputation.service';
import type { MatchedAgent, MatchIntentResult } from './matching.types';

/**
 * Step 5: discover, rank, persist. The planner never writes this table — recommendations are
 * marketplace output, so a ranking is explainable after the fact and independent of a later
 * workflow selection.
 */
@Injectable()
export class MarketplaceMatchingService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly discovery: AgentDiscoveryService,
    private readonly ranking: AgentRankingService,
    private readonly availability: AgentAvailabilityService,
    private readonly reputation: AgentReputationService,
    private readonly pricing: AgentPricingService,
    private readonly events: EventStoreService,
  ) {}

  async matchIntent(input: {
    intentId: string;
    userId: string;
    graph: CapabilityGraphNode[];
    queryEmbedding?: number[];
  }): Promise<MatchIntentResult> {
    const unmatchedTaxonomyKeys: string[] = [];
    const matches: MatchedAgent[] = [];

    await this.db
      .delete(recommendations)
      .where(eq(recommendations.intentId, input.intentId));

    for (const node of input.graph) {
      const discovered = await this.discovery.findForNode(
        node,
        input.queryEmbedding,
      );

      if (discovered.length === 0) {
        unmatchedTaxonomyKeys.push(node.taxonomyKey);
        continue;
      }

      const priced = await Promise.all(
        discovered.map(async (candidate) => ({
          capabilityId: candidate.capability.id,
          agentId: candidate.agent.id,
          unitPrice: candidate.capability.unitPrice,
          capabilityFit: candidate.fit,
          availability: await this.availability.score01(candidate.agent.id),
          reputation: await this.reputation.score01(candidate.agent.id),
          candidate,
        })),
      );

      const ranked = this.ranking.rank(priced);

      for (const row of ranked) {
        const source = priced.find(
          (item) => item.capabilityId === row.capabilityId,
        );
        if (!source) continue;

        const quote = this.pricing.quote(source.candidate.capability);

        await this.db.insert(recommendations).values({
          intentId: input.intentId,
          graphNodeId: node.id,
          requestedTaxonomyKey: node.taxonomyKey,
          agentId: row.agentId,
          capabilityId: row.capabilityId,
          rank: row.rank,
          score: row.score,
          capabilityFitScore: row.capabilityFit,
          reputationScore: row.reputation,
          priceScore: row.priceScore,
          availabilityScore: row.availability,
          scoringWeights: row.scoringWeights,
          quotedPrice: quote.amount,
          quotedAssetId: quote.assetId,
          settlementRail: quote.settlementRail,
        });

        matches.push({
          graphNodeId: node.id,
          requestedTaxonomyKey: node.taxonomyKey,
          rank: row.rank,
          score: row.score,
          capabilityFitScore: row.capabilityFit,
          priceScore: row.priceScore,
          availabilityScore: row.availability,
          reputationScore: row.reputation,
          quotedPrice: quote.amount,
          quotedAssetId: quote.assetId,
          settlementRail: quote.settlementRail,
          match: source.candidate.match,
          agent: {
            id: source.candidate.agent.id,
            slug: source.candidate.agent.slug,
            name: source.candidate.agent.name,
          },
          capability: {
            id: source.candidate.capability.id,
            name: source.candidate.capability.name,
            taxonomyKey: source.candidate.capability.taxonomyKey,
          },
        });
      }
    }

    await this.events.append({
      type: 'intent.matched',
      subjectType: 'intent',
      subjectId: input.intentId,
      actorKind: 'system',
      actorId: input.userId,
      correlationId: input.intentId,
      payload: {
        matchCount: matches.length,
        unmatchedTaxonomyKeys,
      },
    });

    return { matches, unmatchedTaxonomyKeys };
  }

  async listForIntent(intentId: string): Promise<MatchedAgent[]> {
    const rows = await this.db
      .select({
        recommendation: recommendations,
        agent: agents,
        capability: capabilities,
      })
      .from(recommendations)
      .innerJoin(agents, eq(agents.id, recommendations.agentId))
      .innerJoin(
        capabilities,
        eq(capabilities.id, recommendations.capabilityId),
      )
      .where(eq(recommendations.intentId, intentId))
      .orderBy(asc(recommendations.rank));

    return rows.map((row) => ({
      graphNodeId: row.recommendation.graphNodeId,
      requestedTaxonomyKey: row.recommendation.requestedTaxonomyKey,
      rank: row.recommendation.rank,
      score: row.recommendation.score,
      capabilityFitScore: row.recommendation.capabilityFitScore,
      priceScore: row.recommendation.priceScore,
      availabilityScore: row.recommendation.availabilityScore,
      reputationScore: row.recommendation.reputationScore,
      quotedPrice: row.recommendation.quotedPrice,
      quotedAssetId: row.recommendation.quotedAssetId,
      settlementRail: row.recommendation.settlementRail,
      match: row.recommendation.capabilityFitScore >= 1 ? 'exact' : 'vector',
      agent: {
        id: row.agent.id,
        slug: row.agent.slug,
        name: row.agent.name,
      },
      capability: {
        id: row.capability.id,
        name: row.capability.name,
        taxonomyKey: row.capability.taxonomyKey,
      },
    }));
  }
}
