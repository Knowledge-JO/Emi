import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  authorizations,
  agents,
  intents,
  sessions,
  wallets,
  workflowSteps,
  workflows,
} from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import {
  ALTANA_RUNTIME,
  type AltanaRuntime,
  type RuntimeCall,
  type RuntimeExecuteResult,
  type StoredSession,
} from './altana-runtime';
import { PermissionService } from './permission.service';
import { SessionSecretStore } from './session-secret.store';
import { SessionStoreService } from './session-store.service';
import { WalletService } from './wallet.service';

export type SessionExecuteCall = {
  to: string;
  data?: string;
  value?: string;
};

export type SessionExecuteResult = RuntimeExecuteResult;

export type RestoredSession = {
  session: typeof sessions.$inferSelect;
  stored: StoredSession;
  privateKey: `0x${string}`;
};

export type SessionView = {
  id: string;
  walletId: string;
  publicKey: string;
  status: (typeof sessions.$inferSelect)['status'];
  expiry: number;
  grantedToAgentId: string | null;
};

export type IncomingGrant = {
  walletAddress: string;
  publicKey: string;
  sessionPrivateKey: string;
  expiry: number;
  permissions: unknown;
  grantTxHash?: string;
  registered?: boolean;
};

/**
 * Records a session the browser already granted on-chain. This module does not call
 * `grantSession` — the admin signer is a passkey and can only exist in the browser.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly wallets: WalletService,
    private readonly permissions: PermissionService,
    private readonly secrets: SessionSecretStore,
    private readonly store: SessionStoreService,
    private readonly events: EventStoreService,
    @Inject(ALTANA_RUNTIME) private readonly altana: AltanaRuntime,
  ) {}

  async recordGrantForPlan(
    userId: string,
    workflowId: string,
    incoming: IncomingGrant,
  ): Promise<void> {
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

    if (workflow.sessionId && workflow.status === 'authorized') {
      return;
    }

    if (workflow.status !== 'awaiting_authorization') {
      throw new ConflictException('Plan is not awaiting authorization');
    }

    const plan = workflow.authorizationPlan;
    if (!plan) {
      throw new UnprocessableEntityException('Plan has no authorization scope');
    }

    const wallet = await this.wallets.findForUser(userId);
    if (!wallet) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'wallet_missing',
        error:
          'A passkey wallet must be registered before a session can be granted',
      });
    }

    if (wallet.address !== incoming.walletAddress.toLowerCase()) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_wallet_mismatch',
        error: 'Grant was signed for a wallet that is not this account',
      });
    }

    const grantPermissions = this.permissions.parseGrantPermissions(
      incoming.permissions,
    );
    this.permissions.assertGrantMatchesPlan(
      plan,
      grantPermissions,
      incoming.expiry,
    );

    const sessionId = randomUUID();
    const secretProvider = this.config.get('altana.secretProvider', {
      infer: true,
    });
    const providerForRow = secretProvider === 'env' ? 'file' : secretProvider;

    await this.secrets.put(sessionId, incoming.sessionPrivateKey);

    try {
      const composer = await this.db
        .select({ agentId: workflowSteps.agentId })
        .from(workflowSteps)
        .innerJoin(agents, eq(agents.id, workflowSteps.agentId))
        .where(
          and(
            eq(workflowSteps.workflowId, workflowId),
            eq(agents.canSubcontract, true),
          ),
        )
        .limit(1);
      const [firstStep] = await this.db
        .select({ agentId: workflowSteps.agentId })
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId))
        .orderBy(asc(workflowSteps.sequence))
        .limit(1);

      await this.store.persistGrant({
        id: sessionId,
        walletId: wallet.id,
        grantedToAgentId: composer[0]?.agentId ?? firstStep?.agentId ?? null,
        publicKey: incoming.publicKey,
        serialized: {
          walletAddress: incoming.walletAddress,
          publicKey: incoming.publicKey,
          permissions: incoming.permissions,
          expiry: incoming.expiry,
        },
        secretProvider: providerForRow,
        secretRef: sessionId,
        expiry: incoming.expiry,
        registered: incoming.registered ?? true,
        permissions: grantPermissions,
        grantTxHash: incoming.grantTxHash,
        keystoreAddress: this.config.get('altana.keyStore', { infer: true }),
      });

      await this.db
        .update(workflows)
        .set({
          walletId: wallet.id,
          sessionId,
          status: 'authorized',
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(workflows.id, workflowId),
            eq(workflows.status, 'awaiting_authorization'),
          ),
        );

      if (!wallet.adminKeyRegistered) {
        await this.db
          .update(wallets)
          .set({
            adminKeyRegistered: true,
            adminKeyRegisteredAt: new Date(),
            adminRegistrationTxHash:
              incoming.grantTxHash?.toLowerCase() ?? null,
          })
          .where(eq(wallets.id, wallet.id));
      }

      await this.events.append({
        type: 'session.granted',
        subjectType: 'session',
        subjectId: sessionId,
        actorKind: 'user',
        actorId: userId,
        correlationId: intent.id,
        payload: {
          workflowId,
          walletId: wallet.id,
          registered: incoming.registered ?? true,
          grantTxHash: incoming.grantTxHash ?? null,
        },
      });

      await this.events.append({
        type: 'workflow.authorized',
        subjectType: 'workflow',
        subjectId: workflowId,
        actorKind: 'user',
        actorId: userId,
        correlationId: intent.id,
        payload: { sessionId },
      });
    } catch (error) {
      await this.secrets.delete(sessionId);
      throw error;
    }
  }

  async getForUser(userId: string, sessionId: string): Promise<SessionView> {
    const session = await this.requireOwnedSession(userId, sessionId);
    return toSessionView(session);
  }

  /**
   * Reconstitute the JSON-safe half + secret. Used by execute and signOrder.
   * Does not construct an SDK Session — that stays in AltanaRuntime.
   */
  async restoreForUser(
    userId: string,
    sessionId: string,
  ): Promise<RestoredSession> {
    const session = await this.requireOwnedSession(userId, sessionId);
    if (session.status !== 'active') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_not_active',
        error: `Session is ${session.status}`,
      });
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_expired',
        error: 'Session expiry is already in the past',
      });
    }

    const privateKey = await this.secrets.get(session.secretRef);
    if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_secret_missing',
        error: 'The session key is not in the secret store',
      });
    }

    return {
      session,
      stored: session.serialized as StoredSession,
      privateKey: privateKey as `0x${string}`,
    };
  }

  /**
   * Restore the granted session and submit calls. Calldata is built elsewhere; this method
   * only checks the allowlist, reconstitutes the Session, and talks to Altana.
   */
  async executeForUser(
    userId: string,
    sessionId: string,
    calls: SessionExecuteCall[],
  ): Promise<SessionExecuteResult> {
    const restored = await this.restoreForUser(userId, sessionId);
    const grant = this.permissions.parseGrantPermissions(
      restored.stored.permissions,
    );
    this.permissions.assertCallsAllowed(
      (grant.calls ?? []).map((call) => call.to),
      calls,
    );

    const result = await this.altana.execute({
      chain: this.config.get('altana.chain', { infer: true }),
      chainId: this.config.get('altana.chainId', { infer: true }),
      stored: restored.stored,
      privateKey: restored.privateKey,
      calls: toRuntimeCalls(calls),
    });

    await this.db
      .update(sessions)
      .set({
        useCount: restored.session.useCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(sessions.id, restored.session.id));

    return result;
  }

  async executeForAgent(
    agentId: string,
    sessionId: string,
    calls: SessionExecuteCall[],
  ): Promise<SessionExecuteResult> {
    const restored = await this.restoreForAgent(agentId, sessionId);
    const grant = this.permissions.parseGrantPermissions(
      restored.stored.permissions,
    );
    this.permissions.assertCallsAllowed(
      (grant.calls ?? []).map((call) => call.to),
      calls,
    );

    const result = await this.altana.execute({
      chain: this.config.get('altana.chain', { infer: true }),
      chainId: this.config.get('altana.chainId', { infer: true }),
      stored: restored.stored,
      privateKey: restored.privateKey,
      calls: toRuntimeCalls(calls),
    });

    await this.db
      .update(sessions)
      .set({
        useCount: restored.session.useCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(sessions.id, restored.session.id));

    return result;
  }

  async findActiveIdForUser(
    userId: string,
    workflowStepId?: string | null,
  ): Promise<string | null> {
    if (workflowStepId) {
      const step = await this.db.query.workflowSteps.findFirst({
        where: eq(workflowSteps.id, workflowStepId),
      });
      if (step) {
        const workflow = await this.db.query.workflows.findFirst({
          where: eq(workflows.id, step.workflowId),
        });
        if (workflow?.sessionId) {
          return workflow.sessionId;
        }
      }
    }

    const wallet = await this.wallets.findForUser(userId);
    if (!wallet) {
      return null;
    }
    const session = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.walletId, wallet.id), eq(sessions.status, 'active')),
      orderBy: [desc(sessions.createdAt)],
    });
    return session?.id ?? null;
  }

  async findActiveIdForAgent(agentId: string): Promise<string | null> {
    const wallet = await this.wallets.findForAgent(agentId);
    if (!wallet) {
      return null;
    }
    const session = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.walletId, wallet.id), eq(sessions.status, 'active')),
      orderBy: [desc(sessions.createdAt)],
    });
    return session?.id ?? null;
  }

  async restoreForAgent(
    agentId: string,
    sessionId: string,
  ): Promise<RestoredSession> {
    const session = await this.requireOwnedAgentSession(agentId, sessionId);
    if (session.status !== 'active') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_not_active',
        error: `Session is ${session.status}`,
      });
    }
    const privateKey = await this.secrets.get(session.secretRef);
    if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_secret_missing',
        error: 'The session key is not in the secret store',
      });
    }
    return {
      session,
      stored: session.serialized as StoredSession,
      privateKey: privateKey as `0x${string}`,
    };
  }

  /**
   * Record an on-chain revoke the browser already signed with the admin passkey.
   * Deletes the session secret so a revoked key cannot execute even if the row remains.
   */
  async recordRevokeForUser(
    userId: string,
    sessionId: string,
    incoming: { revokeTxHash?: string },
  ): Promise<SessionView> {
    const session = await this.requireOwnedSession(userId, sessionId);

    if (session.status === 'revoked') {
      return toSessionView(session);
    }

    const revokedAt = new Date();
    await this.db
      .update(sessions)
      .set({
        status: 'revoked',
        revokedAt,
        revokeReason: 'user_revoked',
      })
      .where(eq(sessions.id, session.id));

    await this.db
      .update(authorizations)
      .set({
        revokeTxHash: incoming.revokeTxHash?.toLowerCase() ?? null,
        revokedAt,
        onchainValid: false,
      })
      .where(eq(authorizations.sessionId, session.id));

    await this.secrets.delete(session.secretRef);

    const bound = await this.db.query.workflows.findFirst({
      where: eq(workflows.sessionId, session.id),
    });
    if (bound && (bound.status === 'authorized' || bound.status === 'failed')) {
      await this.db
        .update(workflows)
        .set({
          status: 'cancelled',
          failure: {
            code: 'session_revoked',
            message: 'Session was revoked before the plan finished',
          },
        })
        .where(eq(workflows.id, bound.id));
    }

    await this.events.append({
      type: 'session.revoked',
      subjectType: 'session',
      subjectId: session.id,
      actorKind: 'user',
      actorId: userId,
      correlationId: bound?.intentId ?? null,
      payload: {
        revokeTxHash: incoming.revokeTxHash ?? null,
        workflowId: bound?.id ?? null,
      },
    });

    return {
      ...toSessionView(session),
      status: 'revoked',
    };
  }

  private async requireOwnedSession(userId: string, sessionId: string) {
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const wallet = await this.wallets.findForUser(userId);
    if (!wallet || wallet.id !== session.walletId) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async requireOwnedAgentSession(agentId: string, sessionId: string) {
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const wallet = await this.wallets.findForAgent(agentId);
    if (!wallet || wallet.id !== session.walletId) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }
}

function toSessionView(session: typeof sessions.$inferSelect): SessionView {
  return {
    id: session.id,
    walletId: session.walletId,
    publicKey: session.sessionPublicKey,
    status: session.status,
    expiry: Math.floor(session.expiresAt.getTime() / 1000),
    grantedToAgentId: session.grantedToAgentId,
  };
}

function toRuntimeCalls(calls: SessionExecuteCall[]): RuntimeCall[] {
  return calls.map((call) => ({
    to: call.to as `0x${string}`,
    ...(call.data ? { data: call.data as `0x${string}` } : {}),
    ...(call.value && call.value !== '0' ? { value: BigInt(call.value) } : {}),
  }));
}
