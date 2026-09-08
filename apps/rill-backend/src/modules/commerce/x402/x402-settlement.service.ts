import { Inject, Injectable } from '@nestjs/common';

import type { X402Requirement } from './x402-challenge';
import { X402_FACILITATOR, type X402Facilitator } from './x402-facilitator';

/**
 * Facilitator verify + settle. A capability result is only returned once settlement
 * is confirmed or the payment is provably collectable.
 */
@Injectable()
export class X402SettlementService {
  constructor(
    @Inject(X402_FACILITATOR) private readonly facilitator: X402Facilitator,
  ) {}

  async collect(paymentHeader: string, requirements: X402Requirement) {
    const verified = await this.facilitator.verify(paymentHeader, requirements);
    if (!verified.valid) {
      return {
        ok: false as const,
        code: 'x402_payment_invalid',
        message: verified.invalidReason ?? 'Facilitator rejected the payment',
      };
    }

    const settled = await this.facilitator.settle(paymentHeader, requirements);
    if (!settled.success) {
      return {
        ok: false as const,
        code: 'x402_settlement_failed',
        message: settled.error ?? 'Facilitator could not settle',
      };
    }

    return {
      ok: true as const,
      txHash: settled.txHash ?? null,
    };
  }
}
