import { Injectable } from '@nestjs/common';

import { recommendations } from '../../database/schema';

export type SelectableRecommendation = typeof recommendations.$inferSelect;

/**
 * Bind each capability-graph node to one listing. Rank 1 wins; the rest stay on the row as
 * failover candidates. Selection is recorded on `recommendations.selected` and then copied onto
 * `workflow_steps` — ranking itself is not a choice.
 */
@Injectable()
export class AgentSelectionService {
  pickRankOne(
    graphNodeIds: string[],
    rows: SelectableRecommendation[],
  ): {
    selected: SelectableRecommendation[];
    unmatched: string[];
  } {
    const selected: SelectableRecommendation[] = [];
    const unmatched: string[] = [];

    for (const nodeId of graphNodeIds) {
      const ranked = rows
        .filter((row) => row.graphNodeId === nodeId)
        .sort((a, b) => a.rank - b.rank);
      const winner = ranked[0];
      if (!winner) {
        unmatched.push(nodeId);
        continue;
      }
      selected.push(winner);
    }

    return { selected, unmatched };
  }
}
