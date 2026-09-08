import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApiKeyService, lookLikeAgentApiKey } from '../../auth/api-key.service';
import { AuthService } from '../../auth/auth.service';
import {
  type AuthenticatedRequest,
  PrivyAuthGuard,
} from '../../auth/privy-auth.guard';
import type { X402Caller } from './x402-caller';

export type X402Request = Request & { x402Caller?: X402Caller };

/**
 * Users (Privy) and agents (`rill_ak_`) pay on the same rail. Copied from the job caller
 * rather than imported — x402 and ERC-8183 never share a code path.
 */
@Injectable()
export class X402CallerGuard implements CanActivate {
  constructor(
    private readonly keys: ApiKeyService,
    private readonly privy: PrivyAuthGuard,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<X402Request>();
    const header = request.headers.authorization;
    const bearer = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';

    if (lookLikeAgentApiKey(bearer)) {
      const agent = await this.keys.resolveAgent(bearer);
      request.x402Caller = {
        kind: 'agent',
        agentId: agent.agentId,
        slug: agent.slug,
      };
      return true;
    }

    const named = request.headers['x-api-key'];
    if (typeof named === 'string' && lookLikeAgentApiKey(named.trim())) {
      const agent = await this.keys.resolveAgent(named.trim());
      request.x402Caller = {
        kind: 'agent',
        agentId: agent.agentId,
        slug: agent.slug,
      };
      return true;
    }

    await this.privy.canActivate(context);
    const principal = (request as AuthenticatedRequest).principal;
    if (!principal) {
      throw new UnauthorizedException('Missing caller credential');
    }
    const user = await this.auth.requireUser(principal);
    request.x402Caller = { kind: 'user', userId: user.id };
    return true;
  }
}

export const CurrentX402Caller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): X402Caller => {
    const request = context.switchToHttp().getRequest<X402Request>();
    if (!request.x402Caller) {
      throw new UnauthorizedException('Route is not behind X402CallerGuard');
    }
    return request.x402Caller;
  },
);
