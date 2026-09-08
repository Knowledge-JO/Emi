import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc, eq } from 'drizzle-orm';
import { toHex, type Hex } from 'viem';

import type { RillConfigService } from '../../../config/app.config';
import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { jobDeliverables, jobs } from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';
import { encodeSubmitCall } from './erc8183-abi';
import {
  contentHash,
  encodeDeliverableOptParams,
  encodeManifest,
  manifestHash,
  type Erc8183DeliverableManifest,
} from './erc8183-codec';
import { JobAccess } from './job-access';
import type { JobCaller } from './job-caller';
import { JobEscrowService } from './job-escrow.service';

@Injectable()
export class DeliverableService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly access: JobAccess,
    private readonly escrow: JobEscrowService,
    private readonly events: EventStoreService,
  ) {}

  async deliver(
    jobId: string,
    caller: JobCaller,
    input: {
      payload: Record<string, unknown>;
      storageUri?: string;
      contentType?: string;
    },
    sessionId?: string,
  ) {
    const job = await this.access.require(jobId);
    this.access.assertWorker(job, caller);
    if (job.status !== 'funded' && job.status !== 'delivered') {
      throw new UnprocessableEntityException({
        code: 'job_not_funded',
        message: `Job is ${job.status}; deliverable only against a funded job`,
      });
    }
    if (!job.onchainJobId) {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: 'Fund the job on-chain before submitting a deliverable',
      });
    }

    const latest = await this.db.query.jobDeliverables.findFirst({
      where: eq(jobDeliverables.jobId, job.id),
      orderBy: [desc(jobDeliverables.version)],
    });
    if (latest?.decision === 'pending' && job.status === 'delivered') {
      throw new UnprocessableEntityException({
        code: 'job_deliverable_pending',
        message: 'A deliverable is already waiting for a decision',
      });
    }

    const hash = contentHash(input.payload);
    const version = (latest?.version ?? 0) + 1;
    const [row] = await this.db
      .insert(jobDeliverables)
      .values({
        jobId: job.id,
        version,
        submittedByAgentId: caller.kind === 'agent' ? caller.agentId : job.workerAgentId,
        payload: input.payload,
        contentHash: hash,
        storageUri: input.storageUri ?? null,
        decision: 'pending',
      })
      .returning();

    const stack = this.escrow.stack();
    const onchainId = BigInt(job.onchainJobId);
    const manifest: Erc8183DeliverableManifest = {
      version: 1,
      job_id: Number(onchainId),
      chain_id: this.config.get('altana.chainId', { infer: true }),
      contracts: {
        commerce: stack.commerce,
        router: stack.router,
        policy: stack.policy,
      },
      response: {
        content: JSON.stringify(input.payload),
        content_type: input.contentType ?? 'application/json',
      },
      metadata: { rillJobId: job.id, version },
    };
    const manifestText = encodeManifest(manifest);
    const deliverable = manifestHash(manifest);
    const optParams = input.storageUri
      ? encodeDeliverableOptParams(input.storageUri)
      : toHex(JSON.stringify({ deliverable_url: '' }));
    const submit = encodeSubmitCall(stack, onchainId, deliverable, optParams as Hex);

    let execute: Awaited<ReturnType<JobEscrowService['executeAction']>> | null =
      null;
    try {
      execute = await this.escrow.executeAction(caller, job, [submit], sessionId);
    } catch (error) {
      if (!isMissingSession(error)) {
        throw error;
      }
    }

    const confirmed = execute?.status === 'CONFIRMED';
    if (confirmed) {
      await this.db
        .update(jobs)
        .set({ status: 'delivered', deliveredAt: new Date() })
        .where(eq(jobs.id, job.id));
    }

    await this.events.append({
      type: 'job.delivered',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: 'agent',
      actorId: job.workerAgentId,
      payload: {
        workerAgentId: job.workerAgentId,
        deliverableId: row.id,
        version,
        contentHash: hash,
        submitted: confirmed,
      },
    });

    return {
      deliverable: row,
      submit,
      manifestText,
      onchainDeliverable: deliverable,
      execute,
    };
  }
}

function isMissingSession(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    const response = error.getResponse() as { code?: string };
    return response?.code === 'session_missing';
  }
  return false;
}
