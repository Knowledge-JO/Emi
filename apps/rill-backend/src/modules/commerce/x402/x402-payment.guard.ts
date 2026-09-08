import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';

import type { RillConfigService } from '../../../config/app.config';
import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { assets } from '../../../database/schema';
import {
  buildMerchantChallenge,
  decodeXPaymentHeader,
  payerFromPayload,
  paymentNonce,
  QUOTE_PRICE,
  requirementAmount,
  resolveRail,
  resourceUrl,
  settlementToken,
  type X402Challenge,
  type X402Requirement,
} from './x402-challenge';
import { X402LedgerService } from './x402-ledger.service';
import { X402SettlementService } from './x402-settlement.service';

const RESOURCES: Record<string, string> = {
  '/capabilities/quote': 'Swap quote',
  '/capabilities/risk-analysis': 'Position risk analysis',
};

/**
 * Merchant-side x402. Missing payment → HTTP 402 with the price. Present payment is
 * checked against this resource, then verified and settled by the facilitator
 * (ERC-1271, never ecrecover). A capability result is only returned after settlement.
 */
@Injectable()
export class X402PaymentGuard implements CanActivate {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly settlement: X402SettlementService,
    private readonly ledger: X402LedgerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const challenge = this.challengeFor(request);
    const header = paymentHeader(request);

    if (!header) {
      throw new HttpException(challenge, HttpStatus.PAYMENT_REQUIRED);
    }

    let decoded;
    try {
      decoded = decodeXPaymentHeader(header);
    } catch {
      throw new UnprocessableEntityException({
        code: 'x402_payment_malformed',
        message: 'X-PAYMENT is not a base64 x402 envelope',
      });
    }

    const expected = challenge.accepts[0];
    if (!expected) {
      throw new UnprocessableEntityException({
        code: 'x402_resource_unknown',
        message: 'This path is not a priced capability',
      });
    }
    const offered = decoded.accepted ?? expected;

    try {
      assertMatches(offered, expected, decoded, challenge.resource.url);
    } catch (error) {
      throw new UnprocessableEntityException({
        code: 'x402_payment_mismatch',
        message: error instanceof Error ? error.message : 'Payment does not match the resource',
      });
    }

    const nonce = paymentNonce(decoded);
    const chainId = this.config.get('altana.chainId', { infer: true });
    if (nonce) {
      const replay = await this.ledger.findByNonce(chainId, nonce);
      if (replay) {
        throw new ConflictException({
          code: 'x402_payment_replay',
          message: 'This payment nonce has already been collected',
        });
      }
    }

    const collected = await this.settlement.collect(header, expected);
    if (!collected.ok) {
      throw new UnprocessableEntityException({
        code: collected.code,
        message: collected.message,
      });
    }

    const payer =
      payerFromPayload(decoded) ?? '0x0000000000000000000000000000000000000000';
    const asset = await this.db.query.assets.findFirst({
      where: and(
        eq(assets.chainId, chainId),
        eq(assets.address, expected.asset.toLowerCase()),
      ),
    });

    await this.ledger.record({
      direction: 'inbound',
      payerAddress: payer,
      payeeAddress: expected.payTo,
      resourceUrl: challenge.resource.url,
      resourceMethod: request.method,
      httpStatus: 200,
      rail: resolveRail(expected),
      amount: requirementAmount(expected),
      assetId: asset?.id ?? null,
      tokenAddress: expected.asset,
      chainId,
      facilitatorUrl: this.config.get('x402.facilitatorUrl', { infer: true }),
      paymentNonce: nonce,
      settlementTxHash: collected.txHash,
      status: 'settled',
    });

    return true;
  }

  private challengeFor(request: Request): X402Challenge {
    const path = request.path;
    const description = RESOURCES[path];
    if (!description) {
      throw new UnprocessableEntityException({
        code: 'x402_resource_unknown',
        message: 'This path is not a priced capability',
      });
    }
    const chainId = this.config.get('altana.chainId', { infer: true });
    return buildMerchantChallenge({
      resourceUrl: `${request.protocol}://${request.get('host')}${path}`,
      description,
      chainId,
      asset: settlementToken(chainId),
      amount: QUOTE_PRICE,
      payTo: this.config.get('x402.merchantAddress', { infer: true }),
    });
  }
}

function paymentHeader(request: Request): string | null {
  const named = request.headers['x-payment'] ?? request.headers['payment-signature'];
  if (typeof named === 'string' && named.trim()) return named.trim();
  if (Array.isArray(named) && named[0]) return named[0].trim();
  return null;
}

function assertMatches(
  offered: X402Requirement,
  expected: X402Requirement,
  decoded: ReturnType<typeof decodeXPaymentHeader>,
  resourceUrlExpected: string,
): void {
  if (offered.payTo.toLowerCase() !== expected.payTo.toLowerCase()) {
    throw new Error('payTo does not match this merchant');
  }
  if (offered.asset.toLowerCase() !== expected.asset.toLowerCase()) {
    throw new Error('asset does not match the priced token');
  }
  if (requirementAmount(offered) !== requirementAmount(expected)) {
    throw new Error('amount does not match the priced resource');
  }
  const paidUrl = resourceUrl(decoded.resource) ?? resourceUrl(offered.resource);
  if (paidUrl) {
    const paidPath = safePath(paidUrl);
    const expectedPath = safePath(resourceUrlExpected);
    if (paidPath && expectedPath && paidPath !== expectedPath) {
      throw new Error('resource does not match this path');
    }
  }
}

function safePath(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith('/') ? url : null;
  }
}
