import { createHash, randomBytes } from 'node:crypto';

import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { agentIdentities, apiKeys } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';

export const AGENT_API_KEY_PREFIX = 'rill_ak_';

export type AgentPrincipal = {
  kind: 'agent';
  keyId: string;
  agentId: string;
  slug: string;
  identityId: string;
  onchainAgentId: string;
  registryAddress: string;
  chainId: number;
};

/**
 * Agent credentials. Only the SHA-256 digest is stored. The secret is returned once at issue
 * and prefixed `rill_ak_` so a Privy Bearer JWT can never be mistaken for a key.
 */
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly events: EventStoreService,
  ) {}

  async issueForAgent(agentId: string, name: string) {
    const identity = await this.db.query.agentIdentities.findFirst({
      where: eq(agentIdentities.agentId, agentId),
    });
    if (!identity) {
      throw new UnprocessableEntityException({
        message: 'An agent API key requires an ERC-8004 identity',
        code: 'identity_not_attached',
      });
    }

    const secret = AGENT_API_KEY_PREFIX + randomBytes(32).toString('hex');
    const keyHash = hashApiKey(secret);
    const prefix = secret.slice(0, 16);

    const [row] = await this.db
      .insert(apiKeys)
      .values({
        ownerKind: 'agent',
        agentId,
        name,
        prefix,
        keyHash,
        scopes: ['agent'],
        status: 'active',
      })
      .returning();

    await this.events.append({
      type: 'agent.api_key_issued',
      subjectType: 'agent',
      subjectId: agentId,
      actorKind: 'system',
      payload: { keyId: row.id, prefix },
    });

    return {
      id: row.id,
      prefix: row.prefix,
      name: row.name,
      secret,
    };
  }

  async resolveAgent(secret: string): Promise<AgentPrincipal> {
    if (!secret.startsWith(AGENT_API_KEY_PREFIX)) {
      throw new UnauthorizedException('Missing agent API key');
    }

    const row = await this.db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, hashApiKey(secret)),
        eq(apiKeys.ownerKind, 'agent'),
      ),
      with: { agent: { with: { identity: true } } },
    });

    if (!row || row.status !== 'active' || !row.agentId) {
      throw new UnauthorizedException('Invalid or revoked agent API key');
    }
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Agent API key has expired');
    }

    const agent = row.agent;
    const identity = agent?.identity;
    if (!agent || !identity) {
      throw new UnauthorizedException(
        'API key is not resolved to an ERC-8004 identity',
      );
    }

    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id));

    return {
      kind: 'agent',
      keyId: row.id,
      agentId: row.agentId,
      slug: agent.slug,
      identityId: identity.id,
      onchainAgentId: identity.onchainAgentId,
      registryAddress: identity.registryAddress,
      chainId: identity.chainId,
    };
  }
}

export function hashApiKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function lookLikeAgentApiKey(value: string): boolean {
  return value.startsWith(AGENT_API_KEY_PREFIX);
}
