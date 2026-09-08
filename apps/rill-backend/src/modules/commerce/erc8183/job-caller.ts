import type { AgentPrincipal } from '../../auth/api-key.service';

export type JobCaller =
  | { kind: 'user'; userId: string }
  | { kind: 'agent'; agentId: string; slug: string };

export function callerFromAgent(agent: AgentPrincipal): JobCaller {
  return { kind: 'agent', agentId: agent.agentId, slug: agent.slug };
}
