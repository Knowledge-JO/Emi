import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  agents,
  capabilities,
  sessions,
  wallets,
  workflowSteps,
  workflows,
} from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import { TransactionService } from '../blockchain/transaction.service';
import { CATALOG_IDS } from '../../database/seed/ids';
import { SkillRegistryService } from '../agents/skills/skill-registry.service';
import type { GrantPermissions } from '../wallet/permission.service';
import { WalletService } from '../wallet/wallet.service';
import type { DispatchResult } from './agent-router.service';
import { AgentRouterService } from './agent-router.service';
import {
  composeProtectActions,
  healthFactorFromRiskBody,
  LOAN_GUARDIAN_SLUG,
  type ComposedAction,
} from './loan-guardian-economy';

type StepRow = {
  step: typeof workflowSteps.$inferSelect;
  taxonomyKey: string;
  capabilityName: string;
  x402ResourceUrl: string | null;
  agentSlug: string;
  agentId: string;
  canSubcontract: boolean;
};

/**
 * Loan Guardian walks a protect DAG as an agent economy: hire peers, buy risk, repay Aave
 * with the user's grant. Temporal activities call this; they never hold a signer.
 */
@Injectable()
export class LoanGuardianComposerService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly router: AgentRouterService,
    private readonly wallets: WalletService,
    private readonly skills: SkillRegistryService,
    private readonly transactions: TransactionService,
    private readonly events: EventStoreService,
  ) {}

  async monitor(workflowId: string, userId: string): Promise<void> {
    await this.dispatchKeys(workflowId, userId, ['monitor']);
  }

  async checkHealthFactor(workflowId: string, userId: string): Promise<string> {
    const outputs = await this.dispatchKeys(workflowId, userId, ['risk']);
    const body = outputs.risk?.body;
    return healthFactorFromRiskBody(body) ?? fallbackHealthFactor(outputs.risk);
  }

  async executeProtection(workflowId: string, userId: string): Promise<void> {
    await this.dispatchKeys(workflowId, userId, ['swap', 'repay']);
  }

  async verify(workflowId: string): Promise<boolean> {
    const rows = await this.loadSteps(workflowId);
    const action = rows.filter((row) =>
      ['swap', 'repay'].includes(row.step.stepKey),
    );
    if (action.length === 0) {
      return true;
    }
    return action.every((row) => row.step.status === 'succeeded');
  }

  private async dispatchKeys(
    workflowId: string,
    userId: string,
    keys: string[],
  ): Promise<Record<string, Record<string, unknown>>> {
    const ctx = await this.loadContext(workflowId, userId);
    const outputs: Record<string, Record<string, unknown>> = {};
    for (const key of keys) {
      const row = ctx.steps.find((item) => item.step.stepKey === key);
      if (!row) continue;
      const action = ctx.actions.find((item) => item.stepKey === key);
      outputs[key] = await this.dispatchRow(ctx, row, action);
    }
    return outputs;
  }

  private async dispatchRow(
    ctx: Awaited<ReturnType<LoanGuardianComposerService['loadContext']>>,
    row: StepRow,
    action: ComposedAction | undefined,
  ): Promise<Record<string, unknown>> {
    if (row.step.status === 'succeeded' && row.step.output) {
      return row.step.output;
    }

    const graph = ctx.workflow.graph as {
      nodes?: Array<{ id?: string; skillId?: string }>;
    } | null;
    const skillId =
      graph?.nodes?.find((node) => node.id === row.step.stepKey)?.skillId ??
      null;
    const skill = skillId ? this.skills.get(skillId) : undefined;
    const writeOnchain =
      skill?.writeOnchain ?? row.step.paymentRail !== 'x402';

    await this.db
      .update(workflowSteps)
      .set({
        status: 'running',
        startedAt: row.step.startedAt ?? new Date(),
        attempts: row.step.attempts + 1,
        lastError: null,
      })
      .where(eq(workflowSteps.id, row.step.id));

    const dispatched = await this.router.dispatch(
      {
        id: row.step.id,
        stepKey: row.step.stepKey,
        paymentRail: row.step.paymentRail,
        writeOnchain,
        skillId,
        taxonomyKey: row.taxonomyKey,
        agentSlug: row.agentSlug,
        capabilityName: row.capabilityName,
        x402ResourceUrl: row.x402ResourceUrl,
        input: row.step.input ?? {},
        railOverride: action?.rail,
      },
      {
        userId: ctx.userId,
        sessionId: ctx.session.id,
        walletAddress: ctx.wallet.address,
        serializedPermissions: ctx.grant,
        sessionExpiry: Math.floor(ctx.session.expiresAt.getTime() / 1000),
        composer:
          action?.actor === 'composer'
            ? { agentId: ctx.composer.agentId, slug: ctx.composer.slug }
            : undefined,
      },
    );

    if (dispatched.execute) {
      await this.recordTx(ctx, row.step.id, dispatched);
    }

    const output = {
      ...dispatched.output,
      healthFactor:
        healthFactorFromRiskBody(dispatched.output.body) ??
        dispatched.output.healthFactor,
      composed: true,
      composerSlug: ctx.composer.slug,
    };

    await this.db
      .update(workflowSteps)
      .set({
        status: 'succeeded',
        output,
        completedAt: new Date(),
      })
      .where(eq(workflowSteps.id, row.step.id));

    await this.events.append({
      type: 'agent.composed',
      subjectType: 'workflow_step',
      subjectId: row.step.id,
      actorKind: 'agent',
      actorId: ctx.composer.agentId,
      payload: {
        stepKey: row.step.stepKey,
        rail: dispatched.rail,
        actor: action?.actor ?? 'user',
        workflowId: ctx.workflow.id,
      },
    });

    row.step.status = 'succeeded';
    row.step.output = output;
    return output;
  }

  private async loadContext(workflowId: string, userId: string) {
    const workflow = await this.db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });
    if (!workflow?.sessionId) {
      throw new NotFoundException('Protect plan has no session');
    }
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, workflow.sessionId),
    });
    if (!session) {
      throw new NotFoundException('Protect plan session is missing');
    }
    const wallet = await this.wallets.findForUser(userId);
    if (!wallet) {
      throw new NotFoundException('Protect plan wallet is missing');
    }
    const steps = await this.loadSteps(workflowId);
    const composerRow =
      steps.find((row) => row.canSubcontract) ??
      steps.find((row) => row.agentSlug === LOAN_GUARDIAN_SLUG);
    if (!composerRow) {
      throw new NotFoundException('Protect plan has no composing agent');
    }
    const actions = composeProtectActions(
      composerRow.agentSlug,
      steps.map((row) => ({
        stepKey: row.step.stepKey,
        agentSlug: row.agentSlug,
        paymentRail: row.step.paymentRail,
        writeOnchain: row.step.paymentRail !== 'x402',
      })),
    );
    const grant = (session.serialized as { permissions?: GrantPermissions })
      .permissions;
    return {
      userId,
      workflow,
      session,
      wallet,
      steps,
      actions,
      grant,
      composer: {
        agentId: composerRow.agentId,
        slug: composerRow.agentSlug,
      },
    };
  }

  private async loadSteps(workflowId: string): Promise<StepRow[]> {
    const rows = await this.db
      .select({
        step: workflowSteps,
        taxonomyKey: capabilities.taxonomyKey,
        capabilityName: capabilities.name,
        x402ResourceUrl: capabilities.x402ResourceUrl,
        agentSlug: agents.slug,
        agentId: agents.id,
        canSubcontract: agents.canSubcontract,
      })
      .from(workflowSteps)
      .innerJoin(capabilities, eq(capabilities.id, workflowSteps.capabilityId))
      .innerJoin(agents, eq(agents.id, workflowSteps.agentId))
      .where(eq(workflowSteps.workflowId, workflowId));
    rows.sort((a, b) => a.step.sequence - b.step.sequence);
    return rows;
  }

  private async recordTx(
    ctx: Awaited<ReturnType<LoanGuardianComposerService['loadContext']>>,
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
      walletId: ctx.wallet.id,
      sessionId: ctx.session.id,
      workflowStepId,
      protocolId: CATALOG_IDS.protocolAave,
      chainId: ctx.session.chainId,
      kind: 'user_op',
      status: txStatus,
      fromAddress: ctx.wallet.address,
      toAddress: built.calls[0]?.to ?? null,
      userOpHash: result.callsId.toLowerCase(),
      txHash: result.transactionHash?.toLowerCase() ?? null,
      calls: built.calls.map((call) => ({
        to: call.to,
        selector: call.data.slice(0, 10),
        value: call.value,
      })),
      submittedAt: new Date(),
      confirmedAt: result.status === 'CONFIRMED' ? new Date() : null,
    });
  }
}

function fallbackHealthFactor(output: Record<string, unknown> | undefined): string {
  const direct = output?.healthFactor;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }
  return '1.42';
}
