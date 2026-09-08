import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { JobEscrowService } from '../commerce/erc8183/job-escrow.service';
import { X402ClientService } from '../commerce/x402/x402-client.service';
import { ExecutionService } from '../execution/execution.service';
import { BalancesService } from '../wallet/balances.service';
import type { GrantPermissions } from '../wallet/permission.service';
import { SessionService } from '../wallet/session.service';
import { chooseRail, type StepRail } from './agent-router';

export type RouterStep = {
  id: string;
  stepKey: string;
  paymentRail: string;
  writeOnchain: boolean;
  skillId: string | null;
  taxonomyKey: string;
  agentSlug: string;
  capabilityName: string;
  x402ResourceUrl: string | null;
  input: Record<string, unknown>;
  railOverride?: StepRail;
};

export type RouterContext = {
  userId: string;
  sessionId: string;
  walletAddress: string;
  serializedPermissions?: GrantPermissions;
  sessionExpiry: number;
  composer?: { agentId: string; slug: string };
};

export type DispatchResult = {
  rail: StepRail;
  output: Record<string, unknown>;
  built?: Awaited<ReturnType<ExecutionService['buildCalls']>>;
  execute?: Awaited<ReturnType<SessionService['executeForUser']>>;
};

/**
 * Dispatch one bound step over the rail it named. The router never constructs a signer —
 * WalletModule restores the session; commerce opens the hire or pays x402.
 */
@Injectable()
export class AgentRouterService {
  constructor(
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly execution: ExecutionService,
    private readonly sessions: SessionService,
    private readonly balances: BalancesService,
    private readonly x402: X402ClientService,
    private readonly jobs: JobEscrowService,
  ) {}

  async dispatch(
    step: RouterStep,
    ctx: RouterContext,
  ): Promise<DispatchResult> {
    const rail = chooseRail(step);
    if (rail === 'x402') {
      return this.buy(step, ctx);
    }
    if (rail === 'erc8183') {
      return this.hire(step, ctx);
    }
    return this.executeSession(step, ctx);
  }

  private async executeSession(
    step: RouterStep,
    ctx: RouterContext,
  ): Promise<DispatchResult> {
    const allowlist = (ctx.serializedPermissions?.calls ?? []).map(
      (call) => call.to,
    );
    const built = await this.execution.buildCalls({
      step: {
        skillId: step.skillId,
        taxonomyKey: step.taxonomyKey,
        input: step.input,
      },
      recipient: ctx.walletAddress,
      allowlist,
      sessionExpiry: ctx.sessionExpiry,
    });

    await this.balances.assertReady(
      ctx.userId,
      built.quote?.path[0]
        ? [
            {
              token: built.quote.path[0],
              minimum: BigInt(built.quote.amountIn),
            },
          ]
        : [],
    );

    const execute = await this.sessions.executeForUser(
      ctx.userId,
      ctx.sessionId,
      built.calls,
    );

    return {
      rail: 'session',
      built,
      execute,
      output: {
        rail: 'session',
        play: built.play,
        quote: built.quote,
        callsId: execute.callsId,
        transactionHash: execute.transactionHash ?? null,
        status: execute.status,
      },
    };
  }

  private async buy(
    step: RouterStep,
    ctx: RouterContext,
  ): Promise<DispatchResult> {
    const path = step.x402ResourceUrl ?? '/capabilities/risk-analysis';
    const url = resolveResourceUrl(
      path,
      this.config.get('app.port', { infer: true }),
    );
    const paid = await this.x402.fetch(
      { kind: 'user', userId: ctx.userId },
      {
        url,
        method: 'GET',
        sessionId: ctx.sessionId,
        composerAgentId: ctx.composer?.agentId,
      },
    );
    return {
      rail: 'x402',
      output: {
        rail: 'x402',
        url,
        status: paid.status,
        paid: paid.paid,
        body: paid.body,
        paymentId: paid.payment?.id ?? null,
        composerAgentId: ctx.composer?.agentId ?? null,
        composerSlug: ctx.composer?.slug ?? null,
      },
    };
  }

  private async hire(
    step: RouterStep,
    ctx: RouterContext,
  ): Promise<DispatchResult> {
    const caller = ctx.composer
      ? {
          kind: 'agent' as const,
          agentId: ctx.composer.agentId,
          slug: ctx.composer.slug,
        }
      : { kind: 'user' as const, userId: ctx.userId };
    try {
      const created = await this.jobs.create(caller, {
        workerSlug: step.agentSlug,
        capabilityName: step.capabilityName,
        task: taskFor(step),
        workflowStepId: step.id,
      });
      return {
        rail: 'erc8183',
        output: {
          rail: 'erc8183',
          hired: true,
          jobId: created.job.id,
          status: created.job.status,
          specHash: created.job.specHash,
          hirerKind: caller.kind,
          composerSlug: ctx.composer?.slug ?? null,
        },
      };
    } catch (error) {
      if (!isWorkerWalletMissing(error)) {
        throw error;
      }
      return {
        rail: 'erc8183',
        output: {
          rail: 'erc8183',
          hired: false,
          reason: 'worker_wallet_missing',
          play: step.skillId,
          hirerKind: caller.kind,
          composerSlug: ctx.composer?.slug ?? null,
        },
      };
    }
  }
}

function resolveResourceUrl(pathOrUrl: string, port: number): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `http://127.0.0.1:${port}${path}`;
}

function taskFor(step: RouterStep): string {
  const query =
    typeof step.input.query === 'string' ? step.input.query : step.taxonomyKey;
  return `Run ${step.capabilityName} (${query})`;
}

function isWorkerWalletMissing(error: unknown): boolean {
  if (!(error instanceof UnprocessableEntityException)) {
    return false;
  }
  const response = error.getResponse();
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    response.code === 'worker_wallet_missing'
  );
}
