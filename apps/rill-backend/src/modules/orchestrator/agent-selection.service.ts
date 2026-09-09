import { Injectable } from '@nestjs/common';

import { recommendations } from '../../database/schema';

export type SelectableRecommendation = typeof recommendations.$inferSelect;

export type AgentPick = { graphNodeId: string; agentId: string };

/**
 * Bind each capability-graph node to one listing. Rank 1 wins unless the caller names an
 * agent that already appears in that node's recommendations. The rest stay as failover.
 * Selection is recorded on `recommendations.selected` and copied onto `workflow_steps`.
 */
@Injectable()
export class AgentSelectionService {
  pickRankOne(
    graphNodeIds: string[],
    rows: SelectableRecommendation[],
    picks: AgentPick[] = [],
  ): {
    selected: SelectableRecommendation[];
    unmatched: string[];
    invalid: AgentPick[];
  } {
    const wanted = new Map(picks.map((pick) => [pick.graphNodeId, pick.agentId]));
    const selected: SelectableRecommendation[] = [];
    const unmatched: string[] = [];
    const invalid: AgentPick[] = [];

    for (const nodeId of graphNodeIds) {
      const ranked = rows
        .filter((row) => row.graphNodeId === nodeId)
        .sort((a, b) => a.rank - b.rank);
      const agentId = wanted.get(nodeId);
      const winner = agentId
        ? ranked.find((row) => row.agentId === agentId)
        : ranked[0];
      if (agentId && !winner) {
        invalid.push({ graphNodeId: nodeId, agentId });
        continue;
      }
      if (!winner) {
        unmatched.push(nodeId);
        continue;
      }
      selected.push(winner);
    }

    return { selected, unmatched, invalid };
  }
}
