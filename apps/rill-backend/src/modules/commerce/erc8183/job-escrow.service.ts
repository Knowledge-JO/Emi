import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import type { RillConfigService } from '../../../config/app.config';
import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import {
  agents,
  assets,
  jobs,
  sessions,
  transactions,
  wallets,
  workflowSteps,
} from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';
import { SessionService } from '../../wallet/session.service';
import { WalletService } from '../../wallet/wallet.service';
import {
  encodeHireCalls,
  hirePermissions,
  type EncodedCall,
} from './erc8183-abi';
import { erc8183Stack, type Erc8183Stack } from './erc8183-addresses';
import { specHash, type JobSpec } from './erc8183-codec';
import {
  ERC8183_CHAIN_READER,
  readHireHints,
  readOnchainJob,
  type Erc8183ChainReader,
} from './erc8183-read';
import { JobAccess } from './job-access';
import type { JobCaller } from './job-caller';
import { mirrorLocalStatus } from './job-status';

const DEFAULT_DEADLINE_SECONDS = 1800;

export type CreateJobInput = {
  workerSlug: string;
  capabilityName?: string;
  task: string;
  workflowStepId?: string;
  deadlineSeconds?: number;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class JobEscrowService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(ERC8183_CHAIN_READER) private readonly reader: Erc8183ChainReader,
    private readonly access: JobAccess,
    private readonly wallets: WalletService,
    private readonly sessions: SessionService,
    private readonly events: EventStoreService,
  ) {}

  stack(): Erc8183Stack {
    const chainId = this.config.get('altana.chainId', { infer: true });
    const deployed = erc8183Stack(chainId);
    return {
      ...deployed,
      commerce: this.config.get('erc8183.escrowAddress', { infer: true }),
    };
  }

  async create(caller: JobCaller, input: CreateJobInput) {
    if (caller.kind === 'agent' && !input.task.trim()) {
      throw new UnprocessableEntityException({
        code: 'job_empty_task',
        message: 'A job needs a task — this rail is not for a single API request',
      });
    }

    const worker = await this.db.query.agents.findFirst({
      where: eq(agents.slug, input.workerSlug),
      with: { identity: true, capabilities: true },
    });
    if (!worker || worker.status !== 'active') {
      throw new UnprocessableEntityException({
        code: 'job_worker_not_found',
        message: `No active worker '${input.workerSlug}'`,
      });
    }
    if (!worker.identity) {
      throw new UnprocessableEntityException({
        code: 'identity_not_attached',
        message: 'Worker has no ERC-8004 identity',
      });
    }
    if (caller.kind === 'agent' && caller.agentId === worker.id) {
      throw new UnprocessableEntityException({
        code: 'job_self_hire',
        message: 'An agent cannot hire itself',
      });
    }

    const capability = pickCapability(worker.capabilities, input.capabilityName);
    if (!capability) {
      throw new UnprocessableEntityException({
        code: 'job_capability_missing',
        message: 'Worker has no active ERC-8183 capability',
      });
    }
    if (
      capability.settlementRail !== 'erc8183' ||
      capability.pricingModel !== 'per_job'
    ) {
      throw new UnprocessableEntityException({
        code: 'job_not_escrow_rail',
        message: 'Never open an escrow job for a per-request capability',
      });
    }

    const settlement = await this.requireSettlementAsset();
    if (capability.priceAssetId !== settlement.id) {
      throw new UnprocessableEntityException({
        code: 'job_price_asset_not_settlement_token',
        message: 'ERC-8183 escrow is $U; the listing must be priced in $U',
      });
    }

    const provider = await this.wallets.findForAgent(worker.id);
    if (!provider) {
      throw new UnprocessableEntityException({
        code: 'worker_wallet_missing',
        message: 'Worker has no agent wallet to receive escrow',
      });
    }

    if (input.workflowStepId) {
      await this.assertStepHireable(input.workflowStepId, worker.id, capability.id);
    }

    const spec: JobSpec = {
      task: input.task,
      workerSlug: worker.slug,
      capabilityName: capability.name,
      taxonomyKey: capability.taxonomyKey,
      metadata: input.metadata,
    };
    const hash = specHash(spec);
    const hints = await this.safeHireHints();
    const deadlineAt = new Date(
      Date.now() +
        (Number(hints?.disputeWindow ?? 0) +
          (input.deadlineSeconds ?? DEFAULT_DEADLINE_SECONDS)) *
          1000,
    );

    const [row] = await this.db
      .insert(jobs)
      .values({
        workflowStepId: input.workflowStepId ?? null,
        hirerKind: caller.kind,
        hirerUserId: caller.kind === 'user' ? caller.userId : null,
        hirerAgentId: caller.kind === 'agent' ? caller.agentId : null,
        workerAgentId: worker.id,
        capabilityId: capability.id,
        chainId: this.config.get('altana.chainId', { infer: true }),
        escrowAddress: this.stack().commerce,
        spec,
        specHash: hash,
        amount: capability.unitPrice,
        assetId: settlement.id,
        status: 'created',
        deadlineAt,
      })
      .returning();

    await this.events.append({
      type: 'job.created',
      subjectType: 'job',
      subjectId: row.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: {
        workerAgentId: worker.id,
        workerSlug: worker.slug,
        amount: row.amount,
        specHash: hash,
      },
    });

    return {
      job: row,
      provider: provider.address,
      predictedJobId: hints?.nextJobId.toString() ?? null,
      hireCalls: hints
        ? encodeHireCalls({
            stack: this.stack(),
            jobId: hints.nextJobId,
            provider: provider.address,
            description: hash,
            budget: BigInt(row.amount),
            expiredAt: BigInt(Math.floor(deadlineAt.getTime() / 1000)),
          })
        : [],
      permissions: hirePermissions(this.stack()),
    };
  }

  async hireCalls(jobId: string, caller: JobCaller) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'created') {
      throw new UnprocessableEntityException({
        code: 'job_already_funded',
        message: `Job is ${job.status}`,
      });
    }
    return this.buildHire(job);
  }

  async fund(jobId: string, caller: JobCaller, sessionId?: string) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    if (job.status !== 'created') {
      throw new UnprocessableEntityException({
        code: 'job_already_funded',
        message: `Job is ${job.status}`,
      });
    }

    const built = await this.buildHire(job);
    const resolved = await this.resolveSession(caller, job, sessionId);
    const result = await this.executeCalls(caller, resolved, built.calls);

    const confirmed = result.status === 'CONFIRMED';
    const [updated] = await this.db
      .update(jobs)
      .set({
        onchainJobId: built.predictedJobId,
        createTxHash: result.transactionHash?.toLowerCase() ?? null,
        fundTxHash: result.transactionHash?.toLowerCase() ?? null,
        fundedAt: confirmed ? new Date() : null,
        status: confirmed ? 'funded' : 'created',
      })
      .where(eq(jobs.id, job.id))
      .returning();

    await this.recordTx(job, resolved, built.calls, result);
    await this.events.append({
      type: confirmed ? 'job.funded' : 'job.fund_submitted',
      subjectType: 'job',
      subjectId: job.id,
      actorKind: caller.kind,
      actorId: caller.kind === 'user' ? caller.userId : caller.agentId,
      payload: {
        workerAgentId: job.workerAgentId,
        onchainJobId: built.predictedJobId,
        callsId: result.callsId,
        status: result.status,
      },
    });

    return { job: updated, ...result, predictedJobId: built.predictedJobId };
  }

  async confirmFund(
    jobId: string,
    caller: JobCaller,
    input: { onchainJobId: string; txHash?: string },
  ) {
    const job = await this.access.require(jobId);
    this.access.assertHirer(job, caller);
    const live = await this.readOrThrow(input.onchainJobId);
    if (live.statusName !== 'FUNDED' && live.statusName !== 'OPEN') {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: `On-chain job is ${live.statusName}`,
      });
    }

    const [updated] = await this.db
      .update(jobs)
      .set({
        onchainJobId: input.onchainJobId,
        fundTxHash: input.txHash?.toLowerCase() ?? job.fundTxHash,
        fundedAt: new Date(),
        status: live.statusName === 'FUNDED' ? 'funded' : 'created',
      })
      .where(eq(jobs.id, job.id))
      .returning();

    return this.syncRow(updated);
  }

  async sync(jobId: string, caller: JobCaller) {
    const job = await this.access.require(jobId);
    this.access.assertParty(job, caller);
    return this.syncRow(job);
  }

  async syncRow(job: typeof jobs.$inferSelect) {
    if (!job.onchainJobId) {
      return { job, live: null };
    }
    const live = await this.readOrThrow(job.onchainJobId);
    const status = mirrorLocalStatus(live.statusName, job.status);
    const [updated] = await this.db
      .update(jobs)
      .set({
        status,
        fundedAt: live.statusName === 'OPEN' ? job.fundedAt : (job.fundedAt ?? new Date()),
        deliveredAt:
          live.statusName === 'SUBMITTED' || live.statusName === 'COMPLETED'
            ? (job.deliveredAt ?? new Date())
            : job.deliveredAt,
        settledAt:
          live.statusName === 'COMPLETED' ? (job.settledAt ?? new Date()) : job.settledAt,
      })
      .where(eq(jobs.id, job.id))
      .returning();

    return { job: updated, live };
  }

  async get(jobId: string, caller: JobCaller) {
    const job = await this.access.require(jobId);
    this.access.assertParty(job, caller);
    return job;
  }

  list(caller: JobCaller) {
    return this.access.listFor(caller);
  }

  private async buildHire(job: typeof jobs.$inferSelect) {
    const provider = await this.wallets.findForAgent(job.workerAgentId);
    if (!provider) {
      throw new UnprocessableEntityException({
        code: 'worker_wallet_missing',
        message: 'Worker has no agent wallet to receive escrow',
      });
    }
    const hints = await readHireHints(this.reader, this.stack());
    const expiredAt = BigInt(
      Math.floor((job.deadlineAt ?? new Date(Date.now() + 1800_000)).getTime() / 1000),
    );
    const calls = encodeHireCalls({
      stack: this.stack(),
      jobId: hints.nextJobId,
      provider: provider.address,
      description: job.specHash,
      budget: BigInt(job.amount),
      expiredAt,
    });
    return {
      calls,
      predictedJobId: hints.nextJobId.toString(),
      provider: provider.address,
      permissions: hirePermissions(this.stack()),
    };
  }

  private async safeHireHints() {
    try {
      return await readHireHints(this.reader, this.stack());
    } catch {
      return null;
    }
  }

  private async readOrThrow(onchainJobId: string) {
    try {
      return await readOnchainJob(
        this.reader,
        this.stack(),
        BigInt(onchainJobId),
      );
    } catch {
      throw new UnprocessableEntityException({
        code: 'job_not_on_chain',
        message: `ERC-8183 job ${onchainJobId} is not readable`,
      });
    }
  }

  private async requireSettlementAsset() {
    const chainId = this.config.get('altana.chainId', { infer: true });
    const token = this.stack().paymentToken;
    const row = await this.db.query.assets.findFirst({
      where: and(eq(assets.chainId, chainId), eq(assets.address, token)),
    });
    if (!row) {
      throw new UnprocessableEntityException({
        code: 'settlement_token_unseeded',
        message: `$U (${token}) is not in the catalog for chain ${chainId}`,
      });
    }
    return row;
  }

  private async assertStepHireable(
    stepId: string,
    workerId: string,
    capabilityId: string,
  ) {
    const step = await this.db.query.workflowSteps.findFirst({
      where: eq(workflowSteps.id, stepId),
    });
    if (!step) {
      throw new UnprocessableEntityException({
        code: 'job_step_missing',
        message: 'Workflow step not found',
      });
    }
    if (step.paymentRail !== 'erc8183' || step.kind !== 'agent_job') {
      throw new UnprocessableEntityException({
        code: 'job_step_not_escrow',
        message: 'This step is not an ERC-8183 hire',
      });
    }
    if (step.agentId !== workerId || step.capabilityId !== capabilityId) {
      throw new UnprocessableEntityException({
        code: 'job_step_mismatch',
        message: 'Step is bound to a different worker or capability',
      });
    }
    const existing = await this.db.query.jobs.findFirst({
      where: eq(jobs.workflowStepId, stepId),
    });
    if (existing) {
      throw new ConflictException('This step already has a job');
    }
  }

  private async resolveSession(
    caller: JobCaller,
    job: typeof jobs.$inferSelect,
    sessionId?: string,
  ) {
    if (caller.kind === 'user') {
      const id =
        sessionId ??
        (await this.sessions.findActiveIdForUser(caller.userId, job.workflowStepId));
      if (!id) {
        throw new UnprocessableEntityException({
          code: 'session_missing',
          message: 'Grant a session that includes the ERC-8183 hire selectors',
        });
      }
      return { kind: 'user' as const, userId: caller.userId, sessionId: id };
    }
    const id =
      sessionId ?? (await this.sessions.findActiveIdForAgent(caller.agentId));
    if (!id) {
      throw new UnprocessableEntityException({
        code: 'session_missing',
        message: 'The hiring agent has no session that can fund escrow',
      });
    }
    return { kind: 'agent' as const, agentId: caller.agentId, sessionId: id };
  }

  private executeCalls(
    caller: JobCaller,
    session: { sessionId: string; kind: 'user' | 'agent'; userId?: string; agentId?: string },
    calls: EncodedCall[],
  ) {
    const payload = calls.map((call) => ({
      to: call.to,
      data: call.data,
      value: call.value,
    }));
    if (session.kind === 'user') {
      return this.sessions.executeForUser(session.userId!, session.sessionId, payload);
    }
    return this.sessions.executeForAgent(session.agentId!, session.sessionId, payload);
  }

  async executeAction(
    caller: JobCaller,
    job: typeof jobs.$inferSelect,
    calls: EncodedCall[],
    sessionId?: string,
  ) {
    const resolved = await this.resolveSession(caller, job, sessionId);
    const result = await this.executeCalls(caller, resolved, calls);
    await this.recordTx(job, resolved, calls, result);
    return result;
  }

  private async recordTx(
    job: typeof jobs.$inferSelect,
    session: { sessionId: string },
    calls: EncodedCall[],
    result: { callsId: string; status: string; transactionHash?: string },
  ) {
    const sessionRow = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, session.sessionId),
    });
    const wallet = sessionRow
      ? await this.db.query.wallets.findFirst({
          where: eq(wallets.id, sessionRow.walletId),
        })
      : undefined;

    await this.db.insert(transactions).values({
      walletId: wallet?.id ?? null,
      sessionId: session.sessionId,
      jobId: job.id,
      workflowStepId: job.workflowStepId,
      chainId: job.chainId,
      kind: 'user_op',
      status:
        result.status === 'CONFIRMED'
          ? 'succeeded'
          : result.status === 'FAILED'
            ? 'reverted'
            : 'submitted',
      fromAddress: wallet?.address ?? job.escrowAddress,
      toAddress: calls[0]?.to ?? job.escrowAddress,
      userOpHash: result.callsId.toLowerCase(),
      txHash: result.transactionHash?.toLowerCase() ?? null,
      calls: calls.map((call) => ({
        to: call.to,
        selector: call.data.slice(0, 10),
        value: call.value,
      })),
      submittedAt: new Date(),
      confirmedAt: result.status === 'CONFIRMED' ? new Date() : null,
    });
  }
}

function pickCapability(
  listed: Array<{
    id: string;
    name: string;
    taxonomyKey: string;
    status: string;
    settlementRail: string;
    pricingModel: string;
    unitPrice: string;
    priceAssetId: string;
  }>,
  name?: string,
) {
  const active = listed.filter((cap) => cap.status === 'active');
  if (name) {
    return active.find((cap) => cap.name === name) ?? null;
  }
  return (
    active.find(
      (cap) => cap.settlementRail === 'erc8183' && cap.pricingModel === 'per_job',
    ) ?? null
  );
}
