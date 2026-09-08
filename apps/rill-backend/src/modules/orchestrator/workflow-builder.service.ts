import { Injectable } from '@nestjs/common';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  workflowSteps,
  workflows,
  type CapabilityGraphNode,
  type AuthorizationPlan,
} from '../../database/schema';
import type { SelectableRecommendation } from './agent-selection.service';

export type BoundStep = {
  node: CapabilityGraphNode;
  recommendation: SelectableRecommendation;
  agentName: string;
  agentSlug: string;
  capabilityName: string;
  expectedDurationSeconds: number | null;
  skillId: string | null;
  writeOnchain: boolean;
};

/**
 * Compile the bound graph into a persisted workflow + steps. A swap is short-lived (`inline`);
 * several steps use BullMQ; loan protection is Temporal. The step names the agent, capability
 * and rail — never calldata.
 */
@Injectable()
export class WorkflowBuilderService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async createDraft(input: {
    intentId: string;
    walletId: string | null;
    label: string;
    bound: BoundStep[];
    authorizationPlan: AuthorizationPlan;
    assumptions: string[];
    engine?: 'inline' | 'bullmq' | 'temporal';
  }) {
    const graph = {
      assumptions: input.assumptions,
      nodes: input.bound.map((step) => ({
        id: step.node.id,
        taxonomyKey: step.node.taxonomyKey,
        dependsOn: step.node.dependsOn,
        agentId: step.recommendation.agentId,
        capabilityId: step.recommendation.capabilityId,
        settlementRail: step.recommendation.settlementRail,
        skillId: step.skillId,
      })),
    };

    const [workflow] = await this.db
      .insert(workflows)
      .values({
        intentId: input.intentId,
        walletId: input.walletId,
        label: input.label,
        status: 'awaiting_authorization',
        engine: input.engine ?? 'inline',
        graph,
        authorizationPlan: input.authorizationPlan,
      })
      .returning();

    const steps = await this.db
      .insert(workflowSteps)
      .values(
        input.bound.map((step, index) => ({
          workflowId: workflow.id,
          stepKey: step.node.id,
          sequence: index + 1,
          kind:
            step.recommendation.settlementRail === 'x402'
              ? ('x402_purchase' as const)
              : ('agent_job' as const),
          paymentRail: step.recommendation.settlementRail,
          status: 'pending' as const,
          agentId: step.recommendation.agentId,
          capabilityId: step.recommendation.capabilityId,
          dependsOn: step.node.dependsOn,
          input: step.node.input ?? {},
          timeoutSeconds: step.expectedDurationSeconds,
        })),
      )
      .returning();

    return { workflow, steps };
  }
}
