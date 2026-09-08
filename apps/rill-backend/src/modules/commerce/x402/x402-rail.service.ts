import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../../config/app.config';
import { X402SessionService } from '../../wallet/x402-session.service';
import type { X402Caller } from './x402-caller';
import { PERMIT2_ADDRESS, settlementToken } from './x402-challenge';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * Encodes the one-time Permit2 rail setup. The passkey (or agent admin) still signs in the
 * browser — this service never constructs a signer. The same two calls are returned every
 * time; a repeat approve is a no-op on-chain.
 */
@Injectable()
export class X402RailService {
  constructor(
    private readonly sessions: X402SessionService,
    @Inject(ConfigService) private readonly config: RillConfigService,
  ) {}

  async provisionCalls(
    caller: X402Caller,
    sessionId: string,
    token?: string,
  ) {
    const chainId = this.config.get('altana.chainId', { infer: true });
    const resolved = (token ?? settlementToken(chainId)).toLowerCase();
    if (!ADDRESS.test(resolved)) {
      throw new BadRequestException('token must be a 20-byte hex address');
    }

    const calls =
      caller.kind === 'user'
        ? await this.sessions.provisionCallsForUser(
            caller.userId,
            sessionId,
            resolved,
          )
        : await this.sessions.provisionCallsForAgent(
            caller.agentId,
            sessionId,
            resolved,
          );

    return {
      token: resolved,
      permit2: PERMIT2_ADDRESS,
      rail: 'permit2' as const,
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? '0x',
        value: (call.value ?? 0n).toString(),
      })),
    };
  }
}
