import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { reputation } from '../../database/schema';

/**
 * Derived reputation for ranking. Scores are 0–100 on the `reputation` table; ranking consumes
 * 0–1. No row (or a null score) is 0.5 — a new agent is neither promoted nor buried. This
 * service never writes the table; only the projection job may.
 */
@Injectable()
export class AgentReputationService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async score01(agentId: string): Promise<number> {
    const row = await this.db.query.reputation.findFirst({
      where: and(
        eq(reputation.agentId, agentId),
        eq(reputation.window, 'lifetime'),
      ),
    });

    if (row?.score == null) {
      return 0.5;
    }

    return Math.min(1, Math.max(0, row.score / 100));
  }
}
