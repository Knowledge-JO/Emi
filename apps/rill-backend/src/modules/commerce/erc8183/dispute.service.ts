import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { jobDeliverables, jobs } from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';
import { encodeDisputeCall } from './erc8183-abi';
import { JobAccess } from './job-access';
import type { JobCaller } from './job-caller';
import { JobEscrowService } from './job-escrow.service';

@Injectable()
export class DisputeService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly access: JobAccess,
    private readonly escrow: JobEscrowService,
    private readonly events: EventStoreService,
  ) {}

  async dispute(
    jobId: string,
    caller: JobCaller,
    reason: string,
    sessionId?: string,
  ) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'delivered' && job.status !== 'accepted') {
      throw new UnprocessableEntityException({
        code: 'job_not_disputable',
        message: `Job is ${job.status}`,
      });
    }
    if (!job.onchainJobId) {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: 'Job has no on-chain id',
      });
    }

    const latest = await this.db.query.jobDeliverables.findFirst({
      where: eq(jobDeliverables.jobId, job.id),
      orderBy: [desc(jobDeliverables.version)],
    });
    if (latest) {
      await this.db
        .update(jobDeliverables)
        .set({
          decision: 'rejected',
          decisionReason: reason,
          decidedAt: new Date(),
        })
        .where(eq(jobDeliverables.id, latest.id));
    }

    const call = encodeDisputeCall(this.escrow.stack(), BigInt(job.onchainJobId));
    let execute: Awaited<ReturnType<JobEscrowService['executeAction']>> | null =
      null;
    try {
      execute = await this.escrow.executeAction(caller, job, [call], sessionId);
    } catch (error) {
      const code = (error as { response?: { code?: string } })?.response?.code;
      if (code !== 'session_missing') {
        throw error;
      }
    }

    const confirmed = execute?.status === 'CONFIRMED';
    const [updated] = await this.db
      .update(jobs)
      .set({
        status: 'disputed',
        disputeReason: reason,
        disputeTxHash: execute?.transactionHash?.toLowerCase() ?? job.disputeTxHash,
      })
      .where(eq(jobs.id, job.id))
      .returning();

    await this.events.append({
      type: 'job.disputed',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: { workerAgentId: job.workerAgentId, reason, onchain: confirmed },
    });

    return { job: updated, dispute: call, execute };
  }
}
