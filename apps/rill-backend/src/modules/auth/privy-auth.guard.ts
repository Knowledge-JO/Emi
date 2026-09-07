import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrivyIdentity, type PrivyPrincipal } from './privy-identity.interface';

export type AuthenticatedRequest = Request & { principal?: PrivyPrincipal };

/**
 * Authenticates human callers. The frontend logs in with Privy and sends the resulting access
 * token; this guard verifies it and attaches the caller's DID to the request. It deliberately
 * does not touch the database — knowing *who* is calling and loading *their account* are separate
 * steps, and the first authenticated request happens before an account row exists.
 */
@Injectable()
export class PrivyAuthGuard implements CanActivate {
  constructor(private readonly privy: PrivyIdentity) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = readAccessToken(request);

    if (!accessToken) {
      throw new UnauthorizedException('Missing Privy access token');
    }

    request.principal = await this.privy.verifyAccessToken(
      accessToken,
      readIdentityToken(request),
    );

    return true;
  }
}

/** The verified caller. Only meaningful on routes behind `PrivyAuthGuard`. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PrivyPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.principal) {
      throw new UnauthorizedException('Route is not behind PrivyAuthGuard');
    }

    return request.principal;
  },
);

/**
 * Privy puts the access token in an `Authorization` header when the app stores sessions in local
 * storage (the default), and in a `privy-token` cookie when it uses HttpOnly cookies. Both are
 * read here so switching that dashboard setting does not silently log everyone out.
 */
function readAccessToken(request: Request): string | null {
  const header = request.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim() || null;
  }

  return readCookie(request, 'privy-token');
}

function readIdentityToken(request: Request): string | null {
  const header = request.headers['privy-id-token'];

  if (typeof header === 'string' && header.length > 0) {
    return header;
  }

  return readCookie(request, 'privy-id-token');
}

// Read from the raw header rather than adding cookie-parser for two values.
function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.cookie;
  if (!cookies) return null;

  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim()) || null;
    }
  }

  return null;
}
