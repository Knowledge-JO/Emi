import { Injectable } from '@nestjs/common';

import type {
  CapabilityGraphNode,
  ParsedIntent,
} from '../../database/schema/intents';
import { LanguageModel } from '../ai/language-model';
import {
  FIRST_PARTY_TAXONOMY,
  assertAcyclic,
  planCapabilityGraph,
} from './capability-graph';
import {
  INTENT_PLANNER_SYSTEM,
  plannedGraphJsonSchema,
  plannedGraphSchema,
} from './planned-graph.schema';

export type PlannedCapabilityGraph = {
  graph: CapabilityGraphNode[];
  assumptions: string[];
  source: 'deterministic' | 'llm';
};

/**
 * Goal tree + available capabilities → schema-validated graph. The LLM never holds wallet
 * access. An invalid or unreachable model falls back to the deterministic expander.
 */
@Injectable()
export class IntentPlannerService {
  constructor(private readonly language: LanguageModel) {}

  async plan(
    intent: ParsedIntent,
    available: readonly string[] = FIRST_PARTY_TAXONOMY,
  ): Promise<PlannedCapabilityGraph> {
    const keys = available.length > 0 ? available : FIRST_PARTY_TAXONOMY;
    const fallback = planCapabilityGraph(intent, keys);
    assertAcyclic(fallback);

    if (intent.kind !== 'protect' && intent.legs.length <= 1) {
      return { graph: fallback, assumptions: [], source: 'deterministic' };
    }

    try {
      const generated = await this.language.generateJson({
        jsonSchema: plannedGraphJsonSchema,
        system: INTENT_PLANNER_SYSTEM,
        prompt: JSON.stringify({
          intent: {
            kind: intent.kind,
            summary: intent.summary,
            chain: intent.chain,
            legs: intent.legs,
            goalTree: intent.goalTree,
            missing: intent.missing,
            assumptions: intent.assumptions,
          },
          availableTaxonomyKeys: keys,
        }),
      });
      const parsed = plannedGraphSchema.safeParse(generated.json);
      if (!parsed.success) {
        return {
          graph: fallback,
          assumptions: ['planner_llm_schema_mismatch'],
          source: 'deterministic',
        };
      }
      assertAcyclic(parsed.data.nodes);
      assertKnownTaxonomy(parsed.data.nodes, keys);
      return {
        graph: parsed.data.nodes,
        assumptions: parsed.data.assumptions,
        source: 'llm',
      };
    } catch {
      return {
        graph: fallback,
        assumptions: ['planner_llm_failed'],
        source: 'deterministic',
      };
    }
  }
}

function assertKnownTaxonomy(
  nodes: CapabilityGraphNode[],
  available: readonly string[],
): void {
  const unknown = nodes
    .map((node) => node.taxonomyKey)
    .filter((key) => !available.includes(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown taxonomy: ${unknown.join(', ')}`);
  }
}
