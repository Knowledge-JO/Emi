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
import type { JobCaller } from './job-caller';

export type JobRequest = Request & { jobCaller?: JobCaller };

/**
 * Users (Privy) and agents (`rill_ak_`) hire on the same rail. The prefix keeps the two
 * credentials from colliding on `Authorization: Bearer`.
 */
@Injectable()
export class JobCallerGuard implements CanActivate {
  constructor(
    private readonly keys: ApiKeyService,
    private readonly privy: PrivyAuthGuard,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<JobRequest>();
    const header = request.headers.authorization;
    const bearer = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';

    if (lookLikeAgentApiKey(bearer)) {
      const agent = await this.keys.resolveAgent(bearer);
      request.jobCaller = {
        kind: 'agent',
        agentId: agent.agentId,
        slug: agent.slug,
      };
      return true;
    }

    const named = request.headers['x-api-key'];
    if (typeof named === 'string' && lookLikeAgentApiKey(named.trim())) {
      const agent = await this.keys.resolveAgent(named.trim());
      request.jobCaller = {
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
    request.jobCaller = { kind: 'user', userId: user.id };
    return true;
  }
}

export const CurrentJobCaller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JobCaller => {
    const request = context.switchToHttp().getRequest<JobRequest>();
    if (!request.jobCaller) {
      throw new UnauthorizedException('Route is not behind JobCallerGuard');
    }
    return request.jobCaller;
  },
);
