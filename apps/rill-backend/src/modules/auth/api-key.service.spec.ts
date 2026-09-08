import { UnauthorizedException } from '@nestjs/common';

import {
  AGENT_API_KEY_PREFIX,
  ApiKeyService,
  hashApiKey,
  lookLikeAgentApiKey,
} from './api-key.service';

describe('ApiKeyService', () => {
  it('prefixes secrets so a Privy JWT cannot be mistaken for a key', () => {
    expect(lookLikeAgentApiKey(`${AGENT_API_KEY_PREFIX}ab`)).toBe(true);
    expect(lookLikeAgentApiKey('eyJhbGciOiJFUzI1NiJ9.payload.sig')).toBe(false);
  });

  it('stores only a digest', () => {
    const secret = `${AGENT_API_KEY_PREFIX}${'ab'.repeat(32)}`;
    expect(hashApiKey(secret)).toHaveLength(64);
    expect(hashApiKey(secret)).not.toBe(secret);
  });

  it('refuses a key that is not resolved to an identity', async () => {
    const secret = `${AGENT_API_KEY_PREFIX}${'cd'.repeat(32)}`;
    const db = {
      query: {
        apiKeys: {
          findFirst: () =>
            Promise.resolve({
              id: 'key-1',
              status: 'active',
              ownerKind: 'agent',
              agentId: 'agent-1',
              expiresAt: null,
              agent: { slug: 'swapmaster', identity: null },
            }),
        },
      },
      update: () => ({
        set: () => ({ where: () => Promise.resolve([]) }),
      }),
    };
    const events = { append: jest.fn() };
    const service = new ApiKeyService(db as never, events as never);

    await expect(service.resolveAgent(secret)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('resolves an active key to the ERC-8004 cache', async () => {
    const secret = `${AGENT_API_KEY_PREFIX}${'ef'.repeat(32)}`;
    const db = {
      query: {
        apiKeys: {
          findFirst: () =>
            Promise.resolve({
              id: 'key-1',
              status: 'active',
              ownerKind: 'agent',
              agentId: 'agent-1',
              expiresAt: null,
              agent: {
                slug: 'swapmaster',
                identity: {
                  id: 'ident-1',
                  onchainAgentId: '1',
                  registryAddress: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
                  chainId: 56,
                },
              },
            }),
        },
      },
      update: () => ({
        set: () => ({ where: () => Promise.resolve([]) }),
      }),
    };
    const service = new ApiKeyService(db as never, { append: jest.fn() } as never);

    await expect(service.resolveAgent(secret)).resolves.toMatchObject({
      kind: 'agent',
      agentId: 'agent-1',
      slug: 'swapmaster',
      onchainAgentId: '1',
    });
  });
});
