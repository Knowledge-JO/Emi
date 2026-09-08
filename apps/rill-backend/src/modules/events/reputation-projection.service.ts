import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { events, reputation } from '../../database/schema';
import { projectReputation, type ReputationEvent } from './reputation-score';

/**
 * The only writer of `reputation`. Replays `events` up to a sequence watermark so a score
 * can be reproduced and cannot be bought. Ranking still reads; a missing row is 0.5.
 */
@Injectable()
export class ReputationProjectionService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async projectUpTo(watermark?: number) {
    const rows =
      watermark != null
        ? await this.db.query.events.findMany({
            where: lte(events.seq, watermark),
            orderBy: [asc(events.seq)],
          })
        : await this.db.query.events.findMany({
            orderBy: [asc(events.seq)],
          });
    const source = rows as ReputationEvent[];
    const seq =
      watermark ??
      source.reduce((max, event) => Math.max(max, event.seq), 0);
    const projected = projectReputation(
      watermark != null
        ? source.filter((event) => event.seq <= watermark)
        : source,
    );

    for (const row of projected) {
      await this.upsert(row, seq);
    }

    return {
      watermark: seq,
      agents: projected.length,
      scores: projected.map((row) => ({
        agentId: row.agentId,
        score: row.score,
      })),
    };
  }

  private async upsert(
    row: ReturnType<typeof projectReputation>[number],
    sourceEventSeq: number,
  ) {
    const existing = await this.db.query.reputation.findFirst({
      where: and(
        eq(reputation.agentId, row.agentId),
        eq(reputation.window, 'lifetime'),
      ),
    });

    const values = {
      jobsCompleted: row.jobsCompleted,
      jobsFailed: row.jobsFailed,
      jobsDisputed: row.jobsDisputed,
      disputesLost: row.disputesLost,
      x402Requests: row.x402Requests,
      x402Failures: row.x402Failures,
      p50LatencyMs: row.p50LatencyMs,
      p95LatencyMs: row.p95LatencyMs,
      volumeUsd: row.volumeUsd,
      successRate: row.successRate,
      disputeRate: row.disputeRate,
      score: row.score,
      sourceEventSeq,
      computedAt: new Date(),
    };

    if (existing) {
      await this.db
        .update(reputation)
        .set(values)
        .where(eq(reputation.id, existing.id));
      return;
    }

    await this.db.insert(reputation).values({
      agentId: row.agentId,
      window: 'lifetime',
      ...values,
    });
  }
}
