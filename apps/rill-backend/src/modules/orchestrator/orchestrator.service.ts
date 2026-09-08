import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { CATALOG_IDS } from '../../database/seed/ids';
import {
  agents,
  capabilities,
  intents,
  recommendations,
  sessions,
  workflowSteps,
  workflows,
  type AuthorizationPlan,
  type CapabilityGraphNode,
} from '../../database/schema';
import type { SkillSummary } from '../agents/skills/catalog';
import { SkillRegistryService } from '../agents/skills/skill-registry.service';
import { EventStoreService } from '../events/event-store.service';
import { TransactionService } from '../blockchain/transaction.service';
import { chooseEngine } from '../workflows/choose-engine';
import {
  WORKFLOW_QUEUE,
  type WorkflowQueue,
} from '../workflows/queues/workflow-queue';
import { WorkflowRunnerService } from '../workflows/temporal/workflow-runner.service';
import type { GrantPermissions } from '../wallet/permission.service';
import { SessionService } from '../wallet/session.service';
import { WalletService } from '../wallet/wallet.service';
import type { DispatchResult } from './agent-router.service';
import {
  hasBlockedPending,
  nextReadySteps,
  type RoutableStep,
} from './agent-router';
import { AgentRouterService } from './agent-router.service';
import { AgentSelectionService } from './agent-selection.service';
import { AuthorizationPlannerService } from './authorization-planner.service';
import type { GrantPlanDto } from './grant-plan.dto';
import type { BoundStep } from './workflow-builder.service';
import { WorkflowBuilderService } from './workflow-builder.service';

export type PlanStepResponse = {
  stepKey: string;
  sequence: number;
  kind: string;
  paymentRail: string;
  agent: { id: string; slug: string; name: string };
  capability: { id: string; name: string; taxonomyKey: string };
  skillId: string | null;
  input: Record<string, unknown>;
};

export type PlanResponse = {
  id: string;
  intentId: string;
  status: (typeof workflows.$inferSelect)['status'];
  engine: (typeof workflows.$inferSelect)['engine'];
  walletId: string | null;
  missing: string[];
  assumptions: string[];
  steps: PlanStepResponse[];
  skills: SkillSummary[];
  authorizationPlan: AuthorizationPlan;
  sessionId: string | null;
  sessionPublicKey: string | null;
  sessionStatus: 'active' | 'revoked' | 'expired' | 'pending' | 'failed' | null;
  granted: boolean;
  temporalWorkflowId: string | null;
  temporalRunId: string | null;
  execution: ExecutionView;
};

export type ExecutionView = {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  play: string | null;
  amountIn: string | null;
  amountOut: string | null;
  amountOutMin: string | null;
  path: string[] | null;
  transactionHash: string | null;
  callsId: string | null;
  error: string | null;
};

/**
 * Bind ranked matches to a workflow and attach an authorization plan. This service never
 * constructs a signer or talks to Altana — WalletModule records and restores the session.
 * Calldata comes from ExecutionModule.
 */
@Injectable()
export class OrchestratorService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly selection: AgentSelectionService,
    private readonly builder: WorkflowBuilderService,
    private readonly planner: AuthorizationPlannerService,
    private readonly wallets: WalletService,
    private readonly sessions: SessionService,
    private readonly events: EventStoreService,
    private readonly transactions: TransactionService,
    private readonly skills: SkillRegistryService,
    private readonly router: AgentRouterService,
    private readonly runner: WorkflowRunnerService,
    @Inject(WORKFLOW_QUEUE) private readonly queue: WorkflowQueue,
  ) {}

  async planForUser(userId: string, intentId: string): Promise<PlanResponse> {
    const intent = await this.db.query.intents.findFirst({
      where: eq(intents.id, intentId),
    });

    if (!intent || intent.userId !== userId || !intent.goalTree) {
      throw new NotFoundException('Intent not found');
    }

    const graph = intent.capabilityGraph ?? [];
    if (graph.length === 0) {
      throw new UnprocessableEntityException(
        'Intent has no capability graph to bind',
      );
    }

    const existing = await this.db.query.workflows.findFirst({
      where: and(
        eq(workflows.intentId, intentId),
        eq(workflows.status, 'awaiting_authorization'),
      ),
    });

    if (existing) {
      return this.toResponse(existing.id, userId);
    }

    const rows = await this.db.query.recommendations.findMany({
      where: eq(recommendations.intentId, intentId),
    });

    const { selected, unmatched } = this.selection.pickRankOne(
      graph.map((node) => node.id),
      rows,
    );

    if (unmatched.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'workflow_unmatched_nodes',
        error:
          'Every graph node needs a ranked agent before a plan can be built',
        details: { unmatched },
      });
    }

    const bound = await this.hydrateBoundSteps(graph, selected);
    const planned = await this.planner.planForSteps(
      bound.map((step) => ({
        node: step.node,
        capabilityId: step.recommendation.capabilityId,
        expectedDurationSeconds: step.expectedDurationSeconds,
        skillId: step.skillId,
      })),
    );

    const needsCalls = bound.some((step) => step.writeOnchain);
    if (
      planned.plan.calls.length === 0 &&
      (planned.plan.spend.length > 0 || needsCalls)
    ) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'authorization_plan_empty_allowlist',
        error:
          'Refusing to propose a session with no call allowlist — that would be unrestricted',
        details: { missing: planned.missing },
      });
    }

    const wallet = await this.wallets.findForUser(userId);
    const missing = [...planned.missing];
    if (!wallet) {
      missing.push('wallet');
    }

    await this.markSelected(
      intentId,
      selected.map((row) => row.id),
    );

    const { workflow } = await this.builder.createDraft({
      intentId,
      walletId: wallet?.id ?? null,
      label: intent.goalTree.summary,
      bound,
      authorizationPlan: planned.plan,
      assumptions: planned.assumptions,
      engine: chooseEngine(intent.goalTree.kind, bound.length),
    });

    await this.events.append({
      type: 'workflow.planned',
      subjectType: 'workflow',
      subjectId: workflow.id,
      actorKind: 'user',
      actorId: userId,
      correlationId: intentId,
      payload: {
        stepCount: bound.length,
        walletId: wallet?.id ?? null,
        granted: false,
      },
    });

    const response = await this.toResponse(workflow.id, userId);
    return {
      ...response,
      missing: [...new Set([...response.missing, ...missing])],
    };
  }

  async getPlanForUser(
    userId: string,
    workflowId: string,
  ): Promise<PlanResponse> {
    return this.toResponse(workflowId, userId);
  }

  /**
   * Record a session the browser granted from this plan. Does not call Altana; WalletModule
   * stores serializeSession + the session key after checking the grant is inside the plan.
   */
  async grantForUser(
    userId: string,
    workflowId: string,
    grant: GrantPlanDto,
  ): Promise<PlanResponse> {
    await this.sessions.recordGrantForPlan(userId, workflowId, {
      walletAddress: grant.walletAddress,
      publicKey: grant.publicKey,
      sessionPrivateKey: grant.sessionPrivateKey,
      expiry: grant.expiry,
      permissions: grant.permissions,
      grantTxHash: grant.grantTxHash,
      registered: grant.registered,
    });
    return this.toResponse(workflowId, userId);
  }

  async revokeForUser(
    userId: string,
    workflowId: string,
    incoming: { revokeTxHash?: string },
  ): Promise<PlanResponse> {
    const workflow = await this.requireOwnedWorkflow(userId, workflowId);
    if (!workflow.sessionId) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_missing',
        error: 'Plan has no session to revoke',
      });
    }
    await this.sessions.recordRevokeForUser(
      userId,
      workflow.sessionId,
      incoming,
    );
    return this.toResponse(workflowId, userId);
  }

  /**
   * Build calldata for the bound swap and submit it with the granted session. The orchestrator
   * never talks to Altana; WalletModule restores and executes.
   */
  async executeForUser(
    userId: string,
    workflowId: string,
  ): Promise<PlanResponse> {
    const workflow = await this.requireOwnedWorkflow(userId, workflowId);

    if (workflow.status === 'completed') {
      return this.toResponse(workflowId, userId);
    }

    if (workflow.engine === 'temporal' && workflow.temporalWorkflowId) {
      return this.toResponse(workflowId, userId);
    }

    if (workflow.status === 'running') {
      throw new ConflictException('Plan is already executing');
    }

    if (workflow.status !== 'authorized' && workflow.status !== 'failed') {
      throw new ConflictException('Plan is not ready to execute');
    }

    if (!workflow.sessionId || !workflow.walletId) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_missing',
        error: 'A granted session is required before execute',
      });
    }

    const wallet = await this.wallets.findForUser(userId);
    if (!wallet || wallet.id !== workflow.walletId) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'wallet_missing',
        error: 'The plan wallet is not registered on this account',
      });
    }

    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, workflow.sessionId),
    });
    if (!session) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_missing',
        error: 'The granted session row is missing',
      });
    }
    if (session.status !== 'active') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_not_active',
        error: `Session is ${session.status}`,
      });
    }

    if (workflow.engine === 'temporal') {
      if (!workflow.temporalWorkflowId) {
        await this.runner.startLoanProtection({
          workflowId,
          userId,
        });
      }
      return this.toResponse(workflowId, userId);
    }

    const [claimed] = await this.db
      .update(workflows)
      .set({
        status: 'running',
        startedAt: workflow.startedAt ?? new Date(),
        failure: null,
      })
      .where(
        and(
          eq(workflows.id, workflowId),
          inArray(workflows.status, ['authorized', 'failed']),
        ),
      )
      .returning();

    if (!claimed) {
      throw new ConflictException('Plan is already executing');
    }

    if (workflow.engine === 'bullmq') {
      await this.queue.enqueue({ workflowId, userId });
      return this.toResponse(workflowId, userId);
    }

    return this.runInlineDag(userId, workflowId, workflow, wallet, session);
  }

  /**
   * One ready step for BullMQ. Retries are the queue's job; a reverted userOp does not retry.
   */
  async dispatchQueuedStep(
    userId: string,
    workflowId: string,
  ): Promise<{ more: boolean }> {
    const workflow = await this.requireOwnedWorkflow(userId, workflowId);
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return { more: false };
    }
    const wallet = await this.wallets.findForUser(userId);
    if (!wallet || !workflow.sessionId) {
      throw new UnprocessableEntityException('Queued step is missing a session');
    }
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, workflow.sessionId),
    });
    if (!session || session.status !== 'active') {
      throw new UnprocessableEntityException('Queued step session is not active');
    }
    const result = await this.dispatchNextReady(
      userId,
      workflowId,
      workflow,
      wallet,
      session,
    );
    if (result === 'done') {
      await this.completeWorkflow(userId, workflowId, workflow.intentId, session.id);
      return { more: false };
    }
    if (result === 'failed') {
      return { more: false };
    }
    return { more: true };
  }

  private async runInlineDag(
    userId: string,
    workflowId: string,
    workflow: typeof workflows.$inferSelect,
    wallet: { id: string; address: string },
    session: typeof sessions.$inferSelect,
  ): Promise<PlanResponse> {
    const stepRows = await this.loadRoutableSteps(workflowId);
    if (stepRows.length === 0) {
      await this.markFailed(workflowId, userId, workflow.intentId, {
        code: 'workflow_empty',
        message: 'Plan has no steps to execute',
      });
      throw new UnprocessableEntityException('Plan has no steps to execute');
    }

    try {
      while (true) {
        const result = await this.dispatchNextReady(
          userId,
          workflowId,
          workflow,
          wallet,
          session,
        );
        if (result === 'done') {
          await this.completeWorkflow(
            userId,
            workflowId,
            workflow.intentId,
            session.id,
          );
          return this.toResponse(workflowId, userId);
        }
        if (result === 'failed') {
          return this.toResponse(workflowId, userId);
        }
      }
    } catch (error) {
      const message =
        error instanceof UnprocessableEntityException
          ? exceptionMessage(error)
          : error instanceof Error
            ? error.message
            : 'Execute failed';
      const running = (await this.loadRoutableSteps(workflowId)).find(
        (row) => row.step.status === 'running',
      );
      if (running) {
        await this.db
          .update(workflowSteps)
          .set({
            status: 'failed',
            lastError: { code: 'execute_failed', message },
            completedAt: new Date(),
          })
          .where(eq(workflowSteps.id, running.step.id));
      }
      await this.markFailed(workflowId, userId, workflow.intentId, {
        code: 'execute_failed',
        message,
        stepKey: running?.step.stepKey,
      });
      throw error;
    }
  }

  private async dispatchNextReady(
    userId: string,
    workflowId: string,
    workflow: typeof workflows.$inferSelect,
    wallet: { id: string; address: string },
    session: typeof sessions.$inferSelect,
  ): Promise<'more' | 'done' | 'failed'> {
    const snapshot = await this.loadRoutableSteps(workflowId);
    if (snapshot.length === 0) {
      throw new UnprocessableEntityException('Plan has no steps to execute');
    }
    const routable = snapshot.map((row) => toRoutable(row));
    if (routable.every((step) => step.status === 'succeeded')) {
      return 'done';
    }
    if (hasBlockedPending(routable)) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'workflow_blocked',
        error: 'Pending steps are blocked — the graph is not a DAG',
      });
    }
    const ready = nextReadySteps(routable);
    const current = snapshot.find(
      (row) => row.step.stepKey === ready[0]?.stepKey,
    );
    if (!current) {
      return 'done';
    }

    const graph = workflow.graph as {
      nodes?: Array<{ id?: string; skillId?: string }>;
    } | null;
    const grant = (session.serialized as { permissions?: GrantPermissions })
      .permissions;
    const ctx = {
      userId,
      sessionId: session.id,
      walletAddress: wallet.address,
      serializedPermissions: grant,
      sessionExpiry: Math.floor(session.expiresAt.getTime() / 1000),
    };

    await this.db
      .update(workflowSteps)
      .set({
        status: 'running',
        startedAt: current.step.startedAt ?? new Date(),
        attempts: current.step.attempts + 1,
        lastError: null,
      })
      .where(eq(workflowSteps.id, current.step.id));

    const skillId =
      graph?.nodes?.find((node) => node.id === current.step.stepKey)?.skillId ??
      null;
    const skill = skillId ? this.skills.get(skillId) : undefined;
    const dispatched = await this.router.dispatch(
      {
        id: current.step.id,
        stepKey: current.step.stepKey,
        paymentRail: current.step.paymentRail,
        writeOnchain:
          skill?.writeOnchain ?? current.step.paymentRail !== 'x402',
        skillId,
        taxonomyKey: current.taxonomyKey,
        agentSlug: current.agentSlug,
        capabilityName: current.capabilityName,
        x402ResourceUrl: current.x402ResourceUrl,
        input: current.step.input ?? {},
      },
      ctx,
    );

    if (dispatched.execute) {
      await this.recordExecuteTx(
        wallet.id,
        session.id,
        session.chainId,
        wallet.address,
        current.step.id,
        dispatched,
      );
    }

    if (dispatched.execute?.status === 'FAILED') {
      await this.db
        .update(workflowSteps)
        .set({
          status: 'failed',
          lastError: {
            code: 'execute_failed',
            message: `Session execute failed (${dispatched.execute.statusCode ?? 'no status'})`,
          },
          output: dispatched.output,
          completedAt: new Date(),
        })
        .where(eq(workflowSteps.id, current.step.id));
      await this.markFailed(workflowId, userId, workflow.intentId, {
        code: 'execute_failed',
        message: `Session execute failed (${dispatched.execute.statusCode ?? 'no status'})`,
        stepKey: current.step.stepKey,
      });
      return 'failed';
    }

    await this.db
      .update(workflowSteps)
      .set({
        status: 'succeeded',
        output: dispatched.output,
        completedAt: new Date(),
      })
      .where(eq(workflowSteps.id, current.step.id));

    const after = (await this.loadRoutableSteps(workflowId)).map((row) =>
      toRoutable(row),
    );
    return after.every((step) => step.status === 'succeeded') ? 'done' : 'more';
  }

  private async completeWorkflow(
    userId: string,
    workflowId: string,
    intentId: string,
    sessionId: string,
  ) {
    await this.db
      .update(workflows)
      .set({
        status: 'completed',
        completedAt: new Date(),
        failure: null,
      })
      .where(eq(workflows.id, workflowId));

    const finished = await this.loadRoutableSteps(workflowId);
    const last = [...finished]
      .reverse()
      .find((row) => row.step.output?.transactionHash);
    await this.events.append({
      type: 'workflow.completed',
      subjectType: 'workflow',
      subjectId: workflowId,
      actorKind: 'user',
      actorId: userId,
      correlationId: intentId,
      payload: {
        sessionId,
        callsId:
          typeof last?.step.output?.callsId === 'string'
            ? last.step.output.callsId
            : null,
        transactionHash:
          typeof last?.step.output?.transactionHash === 'string'
            ? last.step.output.transactionHash
            : null,
      },
    });
  }

  private async requireOwnedWorkflow(userId: string, workflowId: string) {
    const workflow = await this.db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });
    if (!workflow) {
      throw new NotFoundException('Plan not found');
    }
    const intent = await this.db.query.intents.findFirst({
      where: eq(intents.id, workflow.intentId),
    });
    if (!intent || intent.userId !== userId) {
      throw new NotFoundException('Plan not found');
    }
    return workflow;
  }

  private async markFailed(
    workflowId: string,
    userId: string,
    intentId: string,
    failure: { code: string; message: string; stepKey?: string },
  ) {
    await this.db
      .update(workflows)
      .set({
        status: 'failed',
        failure,
      })
      .where(eq(workflows.id, workflowId));
    await this.events.append({
      type: 'workflow.failed',
      subjectType: 'workflow',
      subjectId: workflowId,
      actorKind: 'user',
      actorId: userId,
      correlationId: intentId,
      payload: failure,
    });
  }

  private async hydrateBoundSteps(
    graph: CapabilityGraphNode[],
    selected: (typeof recommendations.$inferSelect)[],
  ): Promise<BoundStep[]> {
    const agentIds = [...new Set(selected.map((row) => row.agentId))];
    const capabilityIds = [...new Set(selected.map((row) => row.capabilityId))];

    const agentRows = await this.db
      .select({
        id: agents.id,
        slug: agents.slug,
        name: agents.name,
        metadata: agents.metadata,
      })
      .from(agents)
      .where(inArray(agents.id, agentIds));

    const capabilityRows = await this.db
      .select({
        id: capabilities.id,
        name: capabilities.name,
        taxonomyKey: capabilities.taxonomyKey,
        expectedDurationSeconds: capabilities.expectedDurationSeconds,
      })
      .from(capabilities)
      .where(inArray(capabilities.id, capabilityIds));

    const agentsById = new Map(agentRows.map((row) => [row.id, row]));
    const capsById = new Map(capabilityRows.map((row) => [row.id, row]));

    return selected.map((recommendation) => {
      const node = graph.find((item) => item.id === recommendation.graphNodeId);
      const agent = agentsById.get(recommendation.agentId);
      const capability = capsById.get(recommendation.capabilityId);
      if (!node || !agent || !capability) {
        throw new ConflictException(
          'Selected recommendation is missing its agent or capability',
        );
      }
      const skillId = this.resolveSkillId(
        agent.metadata,
        capability.taxonomyKey,
      );
      const skill = skillId ? this.skills.get(skillId) : undefined;
      return {
        node,
        recommendation,
        agentName: agent.name,
        agentSlug: agent.slug,
        capabilityName: capability.name,
        expectedDurationSeconds: capability.expectedDurationSeconds,
        skillId,
        writeOnchain: skill?.writeOnchain ?? true,
      };
    });
  }

  private resolveSkillId(
    metadata: Record<string, unknown> | null,
    taxonomyKey: string,
  ): string | null {
    const claimed =
      typeof metadata?.skillId === 'string' ? metadata.skillId : null;
    if (claimed && this.skills.get(claimed)) {
      return claimed;
    }
    return this.skills.forTaxonomy(taxonomyKey)?.id ?? null;
  }

  private async markSelected(intentId: string, selectedIds: string[]) {
    await this.db
      .update(recommendations)
      .set({ selected: false })
      .where(eq(recommendations.intentId, intentId));

    if (selectedIds.length === 0) return;

    await this.db
      .update(recommendations)
      .set({ selected: true })
      .where(inArray(recommendations.id, selectedIds));

    for (const id of selectedIds) {
      await this.events.append({
        type: 'recommendation.selected',
        subjectType: 'recommendation',
        subjectId: id,
        actorKind: 'system',
        correlationId: intentId,
        payload: {},
      });
    }
  }

  private async toResponse(
    workflowId: string,
    userId: string,
  ): Promise<PlanResponse> {
    const workflow = await this.db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      throw new NotFoundException('Plan not found');
    }

    const intent = await this.db.query.intents.findFirst({
      where: eq(intents.id, workflow.intentId),
    });

    if (!intent || intent.userId !== userId) {
      throw new NotFoundException('Plan not found');
    }

    const stepRows = await this.db
      .select({
        step: workflowSteps,
        agentId: agents.id,
        agentSlug: agents.slug,
        agentName: agents.name,
        capabilityId: capabilities.id,
        capabilityName: capabilities.name,
        taxonomyKey: capabilities.taxonomyKey,
      })
      .from(workflowSteps)
      .innerJoin(agents, eq(agents.id, workflowSteps.agentId))
      .innerJoin(capabilities, eq(capabilities.id, workflowSteps.capabilityId))
      .where(eq(workflowSteps.workflowId, workflowId));

    stepRows.sort((a, b) => a.step.sequence - b.step.sequence);

    const missing: string[] = [];
    if (!workflow.walletId) {
      missing.push('wallet');
    }

    const sessionRow = workflow.sessionId
      ? await this.db.query.sessions.findFirst({
          where: eq(sessions.id, workflow.sessionId),
        })
      : undefined;

    const plan = workflow.authorizationPlan ?? {
      calls: [],
      spend: [],
      expiry: 0,
    };
    const graph = workflow.graph as {
      assumptions?: string[];
      nodes?: Array<{ id?: string; skillId?: string }>;
    } | null;
    const nodes = graph?.nodes ?? [];
    const skillByStep = new Map(
      nodes
        .filter((node) => typeof node.id === 'string')
        .map((node) => [node.id as string, node.skillId ?? null]),
    );
    const skills = [
      ...new Set(
        nodes
          .map((node) => node.skillId)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ]
      .map((id) => this.skills.summarize(id))
      .filter((skill): skill is SkillSummary => skill !== undefined);

    return {
      id: workflow.id,
      intentId: workflow.intentId,
      status: workflow.status,
      engine: workflow.engine,
      walletId: workflow.walletId,
      missing,
      assumptions: graph?.assumptions ?? [],
      steps: stepRows.map((row) => ({
        stepKey: row.step.stepKey,
        sequence: row.step.sequence,
        kind: row.step.kind,
        paymentRail: row.step.paymentRail,
        agent: {
          id: row.agentId,
          slug: row.agentSlug,
          name: row.agentName,
        },
        capability: {
          id: row.capabilityId,
          name: row.capabilityName,
          taxonomyKey: row.taxonomyKey,
        },
        skillId: skillByStep.get(row.step.stepKey) ?? null,
        input: row.step.input ?? {},
      })),
      skills,
      authorizationPlan: plan,
      sessionId: workflow.sessionId,
      sessionPublicKey: sessionRow?.sessionPublicKey ?? null,
      sessionStatus: sessionRow?.status ?? null,
      granted:
        workflow.sessionId !== null &&
        workflow.status !== 'awaiting_authorization',
      temporalWorkflowId: workflow.temporalWorkflowId ?? null,
      temporalRunId: workflow.temporalRunId ?? null,
      execution: executionView(
        workflow.status,
        lastExecutionOutput(stepRows),
        workflow.failure,
      ),
    };
  }

  private async loadRoutableSteps(workflowId: string) {
    const stepRows = await this.db
      .select({
        step: workflowSteps,
        taxonomyKey: capabilities.taxonomyKey,
        capabilityName: capabilities.name,
        x402ResourceUrl: capabilities.x402ResourceUrl,
        agentSlug: agents.slug,
      })
      .from(workflowSteps)
      .innerJoin(capabilities, eq(capabilities.id, workflowSteps.capabilityId))
      .innerJoin(agents, eq(agents.id, workflowSteps.agentId))
      .where(eq(workflowSteps.workflowId, workflowId));
    stepRows.sort((a, b) => a.step.sequence - b.step.sequence);
    return stepRows;
  }

  private async recordExecuteTx(
    walletId: string,
    sessionId: string,
    chainId: number,
    fromAddress: string,
    workflowStepId: string,
    dispatched: DispatchResult,
  ) {
    const result = dispatched.execute;
    const built = dispatched.built;
    if (!result || !built) {
      return;
    }
    const txStatus =
      result.status === 'CONFIRMED'
        ? ('succeeded' as const)
        : result.status === 'FAILED'
          ? ('reverted' as const)
          : ('submitted' as const);
    await this.transactions.record({
      walletId,
      sessionId,
      workflowStepId,
      protocolId: CATALOG_IDS.protocolPancake,
      chainId,
      kind: 'user_op',
      status: txStatus,
      fromAddress,
      toAddress: built.calls[1]?.to ?? built.calls[0]?.to ?? null,
      userOpHash: result.callsId.toLowerCase(),
      txHash: result.transactionHash?.toLowerCase() ?? null,
      calls: built.calls.map((call) => ({
        to: call.to,
        selector: call.data.slice(0, 10),
        value: call.value,
      })),
      submittedAt: new Date(),
      confirmedAt: result.status === 'CONFIRMED' ? new Date() : null,
      revertReason:
        result.status === 'FAILED'
          ? `execute statusCode ${result.statusCode ?? 'unknown'}`
          : null,
    });
  }
}

function toRoutable(row: {
  step: typeof workflowSteps.$inferSelect;
}): RoutableStep {
  return {
    stepKey: row.step.stepKey,
    status: row.step.status,
    sequence: row.step.sequence,
    paymentRail: row.step.paymentRail,
    writeOnchain: true,
    dependsOn: row.step.dependsOn ?? [],
  };
}

function lastExecutionOutput(
  stepRows: Array<{ step: { output: Record<string, unknown> | null } }>,
): Record<string, unknown> | null | undefined {
  return (
    [...stepRows]
      .reverse()
      .find((row) => typeof row.step.output?.transactionHash === 'string')
      ?.step.output ?? stepRows[stepRows.length - 1]?.step.output
  );
}

function executionView(
  status: (typeof workflows.$inferSelect)['status'],
  output: Record<string, unknown> | null | undefined,
  failure: { code: string; message: string; stepKey?: string } | null,
): ExecutionView {
  const quote =
    output && typeof output.quote === 'object' && output.quote !== null
      ? (output.quote as Record<string, unknown>)
      : null;
  const runStatus =
    status === 'completed'
      ? 'succeeded'
      : status === 'running' || status === 'waiting'
        ? 'running'
        : status === 'failed'
          ? 'failed'
          : 'idle';
  return {
    status: runStatus,
    play: typeof output?.play === 'string' ? output.play : null,
    amountIn: typeof quote?.amountIn === 'string' ? quote.amountIn : null,
    amountOut: typeof quote?.amountOut === 'string' ? quote.amountOut : null,
    amountOutMin:
      typeof quote?.amountOutMin === 'string' ? quote.amountOutMin : null,
    path: Array.isArray(quote?.path)
      ? quote.path.filter((item): item is string => typeof item === 'string')
      : null,
    transactionHash:
      typeof output?.transactionHash === 'string'
        ? output.transactionHash
        : null,
    callsId: typeof output?.callsId === 'string' ? output.callsId : null,
    error: failure?.message ?? null,
  };
}

function exceptionMessage(error: UnprocessableEntityException): string {
  const response = error.getResponse();
  if (typeof response === 'string') return response;
  if (
    typeof response === 'object' &&
    response &&
    'error' in response &&
    typeof response.error === 'string'
  ) {
    return response.error;
  }
  return error.message;
}
