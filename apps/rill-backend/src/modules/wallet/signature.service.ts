import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ALTANA_RUNTIME, type AltanaRuntime } from './altana-runtime';
import { SessionService } from './session.service';

/**
 * Session-key ERC-1271 signatures for later rails (x402 Permit2, ERC-8183 orders).
 * Offline and chain-independent. The verifier must call `isValidSignature`, not ecrecover.
 * This is not a public signing oracle — callers are other backend modules.
 */
@Injectable()
export class SignatureService {
  constructor(
    private readonly sessions: SessionService,
    @Inject(ALTANA_RUNTIME) private readonly altana: AltanaRuntime,
  ) {}

  async signAppDigest(
    userId: string,
    sessionId: string,
    appDigest: string,
  ): Promise<`0x${string}`> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(appDigest)) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'sign_digest_invalid',
        error: 'appDigest must be a 32-byte hex hash',
      });
    }

    const restored = await this.sessions.restoreForUser(userId, sessionId);
    return this.altana.signOrder({
      stored: restored.stored,
      privateKey: restored.privateKey,
      appDigest: appDigest as `0x${string}`,
    });
  }
}
