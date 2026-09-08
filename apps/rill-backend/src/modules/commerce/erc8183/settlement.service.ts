import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { jobDeliverables, jobs } from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';
import { encodeClaimRefundCall, encodeSettleCall } from './erc8183-abi';
import { JobAccess } from './job-access';
import type { JobCaller } from './job-caller';
import { JobEscrowService } from './job-escrow.service';

@Injectable()
export class SettlementService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly access: JobAccess,
    private readonly escrow: JobEscrowService,
    private readonly events: EventStoreService,
  ) {}

  async accept(jobId: string, caller: JobCaller, reason?: string) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'delivered') {
      throw new UnprocessableEntityException({
        code: 'job_not_delivered',
        message: `Job is ${job.status}`,
      });
    }

    const latest = await this.latestDeliverable(job.id);
    if (!latest || latest.decision !== 'pending') {
      throw new UnprocessableEntityException({
        code: 'job_no_pending_deliverable',
        message: 'Nothing to accept',
      });
    }

    const decidedAt = new Date();
    await this.db
      .update(jobDeliverables)
      .set({
        decision: 'accepted',
        decisionReason: reason ?? null,
        decidedAt,
      })
      .where(eq(jobDeliverables.id, latest.id));

    const [updated] = await this.db
      .update(jobs)
      .set({ status: 'accepted', acceptedAt: decidedAt })
      .where(eq(jobs.id, job.id))
      .returning();

    await this.events.append({
      type: 'job.accepted',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: { workerAgentId: job.workerAgentId, deliverableId: latest.id },
    });

    return { job: updated, settle: encodeSettleCall(this.escrow.stack(), BigInt(job.onchainJobId!)) };
  }

  async settle(jobId: string, caller: JobCaller, sessionId?: string) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'accepted' && job.status !== 'delivered') {
      throw new UnprocessableEntityException({
        code: 'job_not_ready_to_settle',
        message: `Job is ${job.status}`,
      });
    }
    if (!job.onchainJobId) {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: 'Job has no on-chain id',
      });
    }

    const call = encodeSettleCall(this.escrow.stack(), BigInt(job.onchainJobId));
    const result = await this.escrow.executeAction(caller, job, [call], sessionId);
    const confirmed = result.status === 'CONFIRMED';
    const [updated] = await this.db
      .update(jobs)
      .set({
        status: confirmed ? 'settled' : job.status,
        settleTxHash: result.transactionHash?.toLowerCase() ?? job.settleTxHash,
        settledAt: confirmed ? new Date() : job.settledAt,
      })
      .where(eq(jobs.id, job.id))
      .returning();

    const latest = await this.latestDeliverable(job.id);
    if (confirmed && latest) {
      await this.db
        .update(jobDeliverables)
        .set({ releaseTxHash: result.transactionHash?.toLowerCase() ?? null })
        .where(eq(jobDeliverables.id, latest.id));
    }

    await this.events.append({
      type: confirmed ? 'job.settled' : 'job.settle_submitted',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: {
        workerAgentId: job.workerAgentId,
        amount: job.amount,
        callsId: result.callsId,
        status: result.status,
      },
    });

    return { job: updated, ...result };
  }

  async refund(jobId: string, caller: JobCaller, sessionId?: string) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (!job.onchainJobId) {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: 'Nothing to refund',
      });
    }
    if (job.deadlineAt && job.deadlineAt.getTime() > Date.now() && job.status === 'funded') {
      throw new UnprocessableEntityException({
        code: 'job_not_expired',
        message: 'claimRefund is only valid after expiredAt',
      });
    }

    const call = encodeClaimRefundCall(
      this.escrow.stack(),
      BigInt(job.onchainJobId),
    );
    const result = await this.escrow.executeAction(caller, job, [call], sessionId);
    const confirmed = result.status === 'CONFIRMED';
    const [updated] = await this.db
      .update(jobs)
      .set({
        status: confirmed ? 'refunded' : job.status,
        cancelTxHash: result.transactionHash?.toLowerCase() ?? job.cancelTxHash,
      })
      .where(eq(jobs.id, job.id))
      .returning();

    await this.events.append({
      type: confirmed ? 'job.refunded' : 'job.refund_submitted',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: {
        workerAgentId: job.workerAgentId,
        callsId: result.callsId,
        status: result.status,
      },
    });

    return { job: updated, ...result };
  }

  async cancel(jobId: string, caller: JobCaller) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'created' || job.onchainJobId) {
      throw new UnprocessableEntityException({
        code: 'job_cannot_cancel',
        message: 'Only an unfunded local job can be cancelled',
      });
    }
    const [updated] = await this.db
      .update(jobs)
      .set({ status: 'cancelled' })
      .where(eq(jobs.id, job.id))
      .returning();
    await this.events.append({
      type: 'job.cancelled',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: { workerAgentId: job.workerAgentId },
    });
    return { job: updated };
  }

  private latestDeliverable(jobId: string) {
    return this.db.query.jobDeliverables.findFirst({
      where: eq(jobDeliverables.jobId, jobId),
      orderBy: [desc(jobDeliverables.version)],
    });
  }
}
