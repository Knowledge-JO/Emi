import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import {
  ALTANA_RUNTIME,
  type AltanaRuntime,
  type RuntimeCall,
  type RuntimeX402FetchResult,
} from './altana-runtime';
import { SessionService } from './session.service';

export type X402FetchInput = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

/**
 * Session-key x402. Commerce never restores a Session — it asks here. Admin provision
 * calls are encoded for the browser; the passkey still signs them.
 */
@Injectable()
export class X402SessionService {
  constructor(
    private readonly sessions: SessionService,
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(ALTANA_RUNTIME) private readonly altana: AltanaRuntime,
  ) {}

  fetchForUser(userId: string, sessionId: string, input: X402FetchInput) {
    return this.sessions.restoreForUser(userId, sessionId).then((restored) =>
      this.pay(restored.stored, restored.privateKey, input),
    );
  }

  fetchForAgent(agentId: string, sessionId: string, input: X402FetchInput) {
    return this.sessions.restoreForAgent(agentId, sessionId).then((restored) =>
      this.pay(restored.stored, restored.privateKey, input),
    );
  }

  provisionCallsForUser(
    userId: string,
    sessionId: string,
    token: string,
  ): Promise<RuntimeCall[]> {
    return this.sessions.restoreForUser(userId, sessionId).then((restored) =>
      this.provision(restored, token),
    );
  }

  provisionCallsForAgent(
    agentId: string,
    sessionId: string,
    token: string,
  ): Promise<RuntimeCall[]> {
    return this.sessions.restoreForAgent(agentId, sessionId).then((restored) =>
      this.provision(restored, token),
    );
  }

  private provision(
    restored: Awaited<ReturnType<SessionService['restoreForUser']>>,
    token: string,
  ): Promise<RuntimeCall[]> {
    return this.altana.x402ProvisionCalls({
      stored: restored.stored,
      privateKey: restored.privateKey,
      token: token.toLowerCase() as `0x${string}`,
    });
  }

  private pay(
    stored: Parameters<AltanaRuntime['fetchWithX402']>[0]['stored'],
    privateKey: `0x${string}`,
    input: X402FetchInput,
  ): Promise<RuntimeX402FetchResult> {
    return this.altana.fetchWithX402({
      stored,
      privateKey,
      url: input.url,
      method: input.method,
      headers: input.headers,
      body: input.body,
      chainId: this.config.get('altana.chainId', { infer: true }),
    });
  }
}
