import { z } from 'zod';

import type { JsonSchema } from '../ai/language-model';

const nodeSchema = z.object({
  id: z.string().min(1),
  goalId: z.string().min(1),
  taxonomyKey: z.string().min(1),
  dependsOn: z.array(z.string().min(1)),
  input: z.record(z.string(), z.unknown()).optional(),
});

export const plannedGraphSchema = z.object({
  nodes: z.array(nodeSchema).min(1),
  assumptions: z.array(z.string()),
});

export type PlannedGraph = z.infer<typeof plannedGraphSchema>;

export const plannedGraphJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['nodes', 'assumptions'],
  properties: {
    nodes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'goalId', 'taxonomyKey', 'dependsOn'],
        properties: {
          id: { type: 'string' },
          goalId: { type: 'string' },
          taxonomyKey: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
          input: { type: 'object' },
        },
      },
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} satisfies JsonSchema;

export const INTENT_PLANNER_SYSTEM = `You turn a validated goal tree into a capability graph.

Rules:
- Every node.taxonomyKey must be one of the available keys you are given.
- dependsOn is a DAG: no cycles, every parent id exists.
- Do not pick agents, protocols, wallets, or signers.
- A simple swap is one node: taxonomyKey defi.swap, dependsOn [].
- Loan protection is four nodes: monitor (research.screen) → risk (risk.health_factor) → swap (defi.swap) → repay (defi.lending.supply). Repay depends on both swap and risk.
- Amounts stay decimal strings. Do not invent an amount the intent did not state.
- Put defaults in assumptions[].`;
