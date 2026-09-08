import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { agentIdentities, agents } from '../../database/schema';
import { availabilityScore } from './availability';

/**
 * Liveness for ranking. Score comes from listing status + ERC-8004 cache freshness.
 * A read failure returns 1 so a missing health row does not silently zero a match.
 */
@Injectable()
export class AgentAvailabilityService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async score01(agentId: string): Promise<number> {
    try {
      const agent = await this.db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });
      const identity = await this.db.query.agentIdentities.findFirst({
        where: eq(agentIdentities.agentId, agentId),
      });
      if (!agent && !identity) {
        return 1;
      }
      return availabilityScore({
        agentStatus: agent?.status,
        hasIdentity: Boolean(identity),
        lastSyncedAt: identity?.lastSyncedAt ?? null,
      });
    } catch {
      return 1;
    }
  }
}
