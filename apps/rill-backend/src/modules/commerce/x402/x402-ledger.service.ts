import { Injectable } from '@nestjs/common';
import { and, desc, eq, or } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { x402Payments } from '../../../database/schema';
import { EventStoreService } from '../../events/event-store.service';

export type RecordPaymentInput = {
  direction: 'outbound' | 'inbound';
  sessionId?: string | null;
  payerWalletId?: string | null;
  payerAddress: string;
  payeeAddress: string;
  payerAgentId?: string | null;
  payeeAgentId?: string | null;
  workflowStepId?: string | null;
  resourceUrl: string;
  resourceMethod: string;
  httpStatus?: number | null;
  rail: 'permit2' | 'eip3009';
  amount: string;
  assetId?: string | null;
  tokenAddress: string;
  chainId: number;
  facilitatorUrl?: string | null;
  paymentNonce?: string | null;
  settlementTxHash?: string | null;
  status: (typeof x402Payments.$inferInsert)['status'];
  error?: { code: string; message: string } | null;
  latencyMs?: number | null;
};

@Injectable()
export class X402LedgerService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly events: EventStoreService,
  ) {}

  async record(input: RecordPaymentInput) {
    const [row] = await this.db
      .insert(x402Payments)
      .values({
        direction: input.direction,
        sessionId: input.sessionId ?? null,
        payerWalletId: input.payerWalletId ?? null,
        payerAddress: input.payerAddress.toLowerCase(),
        payeeAddress: input.payeeAddress.toLowerCase(),
        payerAgentId: input.payerAgentId ?? null,
        payeeAgentId: input.payeeAgentId ?? null,
        workflowStepId: input.workflowStepId ?? null,
        resourceUrl: input.resourceUrl,
        resourceMethod: input.resourceMethod,
        httpStatus: input.httpStatus ?? null,
        rail: input.rail,
        amount: input.amount,
        assetId: input.assetId ?? null,
        tokenAddress: input.tokenAddress.toLowerCase(),
        chainId: input.chainId,
        facilitatorUrl: input.facilitatorUrl ?? null,
        paymentNonce: input.paymentNonce ?? null,
        settlementTxHash: input.settlementTxHash?.toLowerCase() ?? null,
        status: input.status,
        error: input.error ?? null,
        latencyMs: input.latencyMs ?? null,
        settledAt: input.status === 'settled' ? new Date() : null,
      })
      .returning();

    await this.events.append({
      type:
        input.direction === 'outbound'
          ? 'x402.outbound_recorded'
          : 'x402.inbound_recorded',
      subjectType: 'x402_payment',
      subjectId: row.id,
      actorKind: 'system',
      payload: {
        direction: input.direction,
        status: input.status,
        amount: input.amount,
        resourceUrl: input.resourceUrl,
        payerAgentId: input.payerAgentId ?? null,
        payeeAgentId: input.payeeAgentId ?? null,
        latencyMs: input.latencyMs ?? null,
      },
    });

    return row;
  }

  findByNonce(chainId: number, nonce: string) {
    return this.db.query.x402Payments.findFirst({
      where: and(
        eq(x402Payments.chainId, chainId),
        eq(x402Payments.paymentNonce, nonce),
      ),
    });
  }

  listForPayer(input: { userWalletId?: string; agentId?: string }) {
    if (input.agentId) {
      return this.db.query.x402Payments.findMany({
        where: or(
          eq(x402Payments.payerAgentId, input.agentId),
          eq(x402Payments.payeeAgentId, input.agentId),
        ),
        orderBy: [desc(x402Payments.requestedAt)],
      });
    }
    if (input.userWalletId) {
      return this.db.query.x402Payments.findMany({
        where: eq(x402Payments.payerWalletId, input.userWalletId),
        orderBy: [desc(x402Payments.requestedAt)],
      });
    }
    return Promise.resolve([]);
  }
}
