import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { ApiKeyGuard, type AgentAuthenticatedRequest } from './api-key.guard';
import {
  AGENT_API_KEY_PREFIX,
  type AgentPrincipal,
  type ApiKeyService,
} from './api-key.service';

const agent: AgentPrincipal = {
  kind: 'agent',
  keyId: 'key-1',
  agentId: 'agent-1',
  slug: 'swapmaster',
  identityId: 'ident-1',
  onchainAgentId: '1',
  registryAddress: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
  chainId: 56,
};

const contextFor = (headers: Record<string, string>) => {
  const request = { headers } as unknown as AgentAuthenticatedRequest;

  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
};

describe('ApiKeyGuard', () => {
  let keys: jest.Mocked<Pick<ApiKeyService, 'resolveAgent'>>;
  let guard: ApiKeyGuard;

  beforeEach(() => {
    keys = { resolveAgent: jest.fn().mockResolvedValue(agent) };
    guard = new ApiKeyGuard(keys as unknown as ApiKeyService);
  });

  it('rejects a missing key', async () => {
    const { context } = contextFor({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(keys.resolveAgent).not.toHaveBeenCalled();
  });

  it('ignores a Privy-shaped Bearer token', async () => {
    const { context } = contextFor({
      authorization: 'Bearer eyJhbGciOiJFUzI1NiJ9.payload.sig',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(keys.resolveAgent).not.toHaveBeenCalled();
  });

  it('accepts Authorization: Bearer rill_ak_…', async () => {
    const secret = `${AGENT_API_KEY_PREFIX}${'ab'.repeat(32)}`;
    const { context, request } = contextFor({
      authorization: `Bearer ${secret}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(keys.resolveAgent).toHaveBeenCalledWith(secret);
    expect(request.agent).toEqual(agent);
  });

  it('accepts X-Api-Key', async () => {
    const secret = `${AGENT_API_KEY_PREFIX}${'cd'.repeat(32)}`;
    const { context } = contextFor({ 'x-api-key': secret });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(keys.resolveAgent).toHaveBeenCalledWith(secret);
  });
});
