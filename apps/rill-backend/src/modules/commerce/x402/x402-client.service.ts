import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import type { RillConfigService } from '../../../config/app.config';
import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { assets } from '../../../database/schema';
import { WalletService } from '../../wallet/wallet.service';
import { X402SessionService } from '../../wallet/x402-session.service';
import type { X402Caller } from './x402-caller';
import { networkToChainId } from './x402-challenge';
import { X402LedgerService } from './x402-ledger.service';

export type OutboundFetchInput = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  sessionId?: string;
  composerAgentId?: string;
};

/**
 * Outbound x402. Commerce asks WalletModule to restore the session and sign; it never
 * holds a Session itself. A missing session is 422 — the platform has no keys of its own.
 */
@Injectable()
export class X402ClientService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly x402Sessions: X402SessionService,
    private readonly wallets: WalletService,
    private readonly ledger: X402LedgerService,
  ) {}

  async fetch(caller: X402Caller, input: OutboundFetchInput) {
    if (!input.sessionId) {
      throw new UnprocessableEntityException({
        code: 'x402_session_required',
        message: 'Outbound x402 needs a granted session — the platform holds no keys',
      });
    }

    const started = Date.now();
    const wallet =
      caller.kind === 'user'
        ? await this.wallets.findForUser(caller.userId)
        : await this.wallets.findForAgent(caller.agentId);

    const result =
      caller.kind === 'user'
        ? await this.x402Sessions.fetchForUser(
            caller.userId,
            input.sessionId,
            input,
          )
        : await this.x402Sessions.fetchForAgent(
            caller.agentId,
            input.sessionId,
            input,
          );

    let payment: { id: string; status: string } | null = null;
    if (result.paid && result.amount && result.payTo && result.asset) {
      const chainId = result.network
        ? networkToChainId(result.network)
        : this.config.get('altana.chainId', { infer: true });
      const payerAddress = (
        result.payerAddress ??
        wallet?.address ??
        ''
      ).toLowerCase();
      if (!payerAddress) {
        throw new UnprocessableEntityException({
          code: 'x402_payer_unknown',
          message: 'The payment envelope did not name a payer',
        });
      }

      const asset = await this.db.query.assets.findFirst({
        where: and(
          eq(assets.chainId, chainId),
          eq(assets.address, result.asset.toLowerCase()),
        ),
      });

      const row = await this.ledger.record({
        direction: 'outbound',
        sessionId: input.sessionId,
        payerWalletId: wallet?.id ?? null,
        payerAddress,
        payeeAddress: result.payTo,
        payerAgentId:
          caller.kind === 'agent'
            ? caller.agentId
            : (input.composerAgentId ?? null),
        resourceUrl: input.url,
        resourceMethod: (input.method ?? 'GET').toUpperCase(),
        httpStatus: result.status,
        rail: result.rail ?? 'permit2',
        amount: result.amount,
        assetId: asset?.id ?? null,
        tokenAddress: result.asset,
        chainId,
        facilitatorUrl: this.config.get('x402.facilitatorUrl', { infer: true }),
        paymentNonce: result.paymentNonce ?? null,
        status:
          result.status >= 200 && result.status < 300 ? 'settled' : 'authorized',
        latencyMs: Date.now() - started,
      });
      payment = { id: row.id, status: row.status };
    }

    return {
      status: result.status,
      paid: result.paid,
      contentType: result.contentType,
      body: parseBody(result.body, result.contentType),
      payment,
    };
  }
}

function parseBody(body: string, contentType: string | null): unknown {
  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
  return body;
}
