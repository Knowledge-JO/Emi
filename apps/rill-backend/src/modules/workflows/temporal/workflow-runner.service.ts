import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { sessions, workflows } from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';
import {
  DEFAULT_CHECK_EVERY_MS,
  DEFAULT_HF_THRESHOLD,
  DEFAULT_MAX_CHECKS,
  type LoanProtectionInput,
} from './loan-protection';
import {
  TEMPORAL_RUNTIME,
  type TemporalRuntime,
} from './temporal-runtime';

/**
 * Start, record, cancel Temporal runs. The workflows row is the source of the handle so a
 * loan-protection run can always be traced back to the intent that created it.
 */
@Injectable()
export class WorkflowRunnerService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(TEMPORAL_RUNTIME) private readonly temporal: TemporalRuntime,
    private readonly events: EventStoreService,
  ) {}

  async startLoanProtection(input: {
    workflowId: string;
    userId: string;
    threshold?: string;
    checkEveryMs?: number;
    maxChecks?: number;
  }) {
    const payload: LoanProtectionInput = {
      workflowId: input.workflowId,
      userId: input.userId,
      threshold: input.threshold ?? DEFAULT_HF_THRESHOLD,
      checkEveryMs: input.checkEveryMs ?? DEFAULT_CHECK_EVERY_MS,
      maxChecks: input.maxChecks ?? DEFAULT_MAX_CHECKS,
    };
    const handle = await this.temporal.startLoanProtection(payload);

    const [updated] = await this.db
      .update(workflows)
      .set({
        engine: 'temporal',
        status: 'waiting',
        temporalWorkflowId: handle.workflowId,
        temporalRunId: handle.runId,
        startedAt: new Date(),
        failure: null,
      })
      .where(eq(workflows.id, input.workflowId))
      .returning();

    await this.events.append({
      type: 'workflow.temporal_started',
      subjectType: 'workflow',
      subjectId: input.workflowId,
      actorKind: 'user',
      actorId: input.userId,
      payload: {
        temporalWorkflowId: handle.workflowId,
        temporalRunId: handle.runId,
        threshold: payload.threshold,
      },
    });

    return { workflow: updated, handle };
  }

  async sessionIsActive(sessionId: string, now: Date = new Date()): Promise<boolean> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!row || row.status !== 'active') {
      return false;
    }
    return row.expiresAt.getTime() > now.getTime();
  }
}
