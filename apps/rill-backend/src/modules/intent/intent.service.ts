import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { intents, type ParsedIntent } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import { IntentParserService } from './intent-parser.service';

export type IntentResponse = {
  id: string;
  status: (typeof intents.$inferSelect)['status'];
  rawText: string;
  intent: ParsedIntent;
  embeddingDimensions: number;
  planner: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
  createdAt: string;
};

/**
 * Intent lifecycle. This module resolves *what must happen*. It never picks agents and never
 * signs. Persistence is the raw message plus the validated object, so a newer parser can replay.
 */
@Injectable()
export class IntentService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly parser: IntentParserService,
    private readonly events: EventStoreService,
  ) {}

  async createFromMessage(
    userId: string,
    rawText: string,
  ): Promise<IntentResponse> {
    const parsed = await this.parser.parse(rawText);

    const [row] = await this.db
      .insert(intents)
      .values({
        userId,
        rawText,
        status: 'parsed',
        goalTree: parsed.intent,
        plannerModel: parsed.model,
        plannerPromptTokens: parsed.promptTokens,
        plannerCompletionTokens: parsed.completionTokens,
        plannerLatencyMs: parsed.latencyMs,
        parsedAt: new Date(),
      })
      .returning();

    await this.events.append({
      type: 'intent.parsed',
      subjectType: 'intent',
      subjectId: row.id,
      actorKind: 'user',
      actorId: userId,
      correlationId: row.id,
      payload: {
        kind: parsed.intent.kind,
        chain: parsed.intent.chain,
        model: parsed.model,
      },
    });

    return this.toResponse(row, parsed.embedding.length);
  }

  async getForUser(userId: string, id: string) {
    const row = await this.db.query.intents.findFirst({
      where: eq(intents.id, id),
    });

    if (!row || row.userId !== userId || !row.goalTree) {
      return null;
    }

    return this.toResponse(row, 0);
  }

  private toResponse(
    row: typeof intents.$inferSelect,
    embeddingDimensions: number,
  ): IntentResponse {
    return {
      id: row.id,
      status: row.status,
      rawText: row.rawText,
      intent: row.goalTree as ParsedIntent,
      embeddingDimensions,
      planner: {
        model: row.plannerModel ?? '',
        promptTokens: row.plannerPromptTokens ?? 0,
        completionTokens: row.plannerCompletionTokens ?? 0,
        latencyMs: row.plannerLatencyMs ?? 0,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }
}
