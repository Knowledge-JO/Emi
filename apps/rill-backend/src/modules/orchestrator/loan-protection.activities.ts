import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { sessions, workflows } from '../../database/schema';
import type {
  LoanProtectionActivities,
  LoanProtectionInput,
} from '../workflows/temporal/loan-protection';
import { LoanGuardianComposerService } from './loan-guardian-composer.service';

/**
 * Temporal activities for loan protection. I/O lives here so the workflow isolate stays
 * deterministic. They never construct a signer — the composer hires, buys, and executes.
 */
@Injectable()
export class LoanProtectionActivitiesService implements LoanProtectionActivities {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly composer: LoanGuardianComposerService,
  ) {}

  monitor(input: LoanProtectionInput): Promise<void> {
    return this.composer.monitor(input.workflowId, input.userId);
  }

  async assertSession(input: LoanProtectionInput): Promise<boolean> {
    const workflow = await this.db.query.workflows.findFirst({
      where: eq(workflows.id, input.workflowId),
    });
    if (!workflow?.sessionId) {
      return false;
    }
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, workflow.sessionId),
    });
    return (
      session?.status === 'active' && session.expiresAt.getTime() > Date.now()
    );
  }

  checkHealthFactor(input: LoanProtectionInput): Promise<string> {
    return this.composer.checkHealthFactor(input.workflowId, input.userId);
  }

  executeProtection(input: LoanProtectionInput): Promise<void> {
    return this.composer.executeProtection(input.workflowId, input.userId);
  }

  verify(input: LoanProtectionInput): Promise<boolean> {
    return this.composer.verify(input.workflowId);
  }
}
