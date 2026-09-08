import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  ApiKeyService,
  lookLikeAgentApiKey,
  type AgentPrincipal,
} from './api-key.service';

export type AgentAuthenticatedRequest = Request & { agent?: AgentPrincipal };

/**
 * Authenticates machine callers. Accepts `Authorization: Bearer rill_ak_…` or `X-Api-Key`.
 * A Privy JWT never starts with `rill_ak_`, so the two guards cannot confuse credentials.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly keys: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AgentAuthenticatedRequest>();
    const secret = readAgentApiKey(request);

    if (!secret) {
      throw new UnauthorizedException('Missing agent API key');
    }

    request.agent = await this.keys.resolveAgent(secret);
    return true;
  }
}

/** The verified agent. Only meaningful on routes behind `ApiKeyGuard`. */
export const CurrentAgent = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AgentPrincipal => {
    const request = context
      .switchToHttp()
      .getRequest<AgentAuthenticatedRequest>();

    if (!request.agent) {
      throw new UnauthorizedException('Route is not behind ApiKeyGuard');
    }

    return request.agent;
  },
);

function readAgentApiKey(request: Request): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    return lookLikeAgentApiKey(token) ? token : null;
  }

  const named = request.headers['x-api-key'];
  if (typeof named === 'string' && lookLikeAgentApiKey(named.trim())) {
    return named.trim();
  }

  return null;
}
