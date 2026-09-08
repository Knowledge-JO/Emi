import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../../config/app.config';
import type { X402Requirement } from './x402-challenge';

export const X402_FACILITATOR = Symbol('X402_FACILITATOR');

export type FacilitatorVerifyResult = {
  valid: boolean;
  invalidReason?: string;
};

export type FacilitatorSettleResult = {
  success: boolean;
  txHash?: string;
  error?: string;
};

export type X402Facilitator = {
  verify(
    paymentHeader: string,
    requirements: X402Requirement,
  ): Promise<FacilitatorVerifyResult>;
  settle(
    paymentHeader: string,
    requirements: X402Requirement,
  ): Promise<FacilitatorSettleResult>;
};

@Injectable()
export class HttpX402Facilitator implements X402Facilitator {
  constructor(@Inject(ConfigService) private readonly config: RillConfigService) {}

  async verify(
    paymentHeader: string,
    requirements: X402Requirement,
  ): Promise<FacilitatorVerifyResult> {
    const body = await this.post('verify', paymentHeader, requirements);
    return {
      valid: body.isValid === true || body.valid === true,
      invalidReason:
        typeof body.invalidReason === 'string'
          ? body.invalidReason
          : typeof body.error === 'string'
            ? body.error
            : undefined,
    };
  }

  async settle(
    paymentHeader: string,
    requirements: X402Requirement,
  ): Promise<FacilitatorSettleResult> {
    const body = await this.post('settle', paymentHeader, requirements);
    const txHash =
      typeof body.transaction === 'string'
        ? body.transaction
        : typeof body.txHash === 'string'
          ? body.txHash
          : undefined;
    return {
      success: body.success === true || Boolean(txHash),
      txHash,
      error: typeof body.error === 'string' ? body.error : undefined,
    };
  }

  private async post(
    path: string,
    paymentHeader: string,
    requirements: X402Requirement,
  ): Promise<Record<string, unknown>> {
    const base = this.config
      .get('x402.facilitatorUrl', { infer: true })
      .replace(/\/$/, '');
    const response = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        x402Version: requirements.x402Version ?? 2,
        paymentHeader,
        paymentRequirements: requirements,
      }),
    });
    const text = await response.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: text || `facilitator ${path} returned ${response.status}` };
    }
  }
}
