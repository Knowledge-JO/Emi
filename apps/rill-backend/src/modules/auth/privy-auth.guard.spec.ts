import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { PrivyAuthGuard, type AuthenticatedRequest } from './privy-auth.guard';
import type { PrivyIdentity, PrivyPrincipal } from './privy-identity.interface';

const verified: PrivyPrincipal = {
  did: 'did:privy:cm123456789',
  sessionId: 'session-1',
  issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  expiresAt: new Date('2026-01-01T01:00:00.000Z'),
  unverifiedIdentityToken: null,
};

const contextFor = (headers: Record<string, string>) => {
  const request = { headers } as unknown as AuthenticatedRequest;

  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
};

describe('PrivyAuthGuard', () => {
  let privy: jest.Mocked<Pick<PrivyIdentity, 'verifyAccessToken'>>;
  let guard: PrivyAuthGuard;

  beforeEach(() => {
    privy = { verifyAccessToken: jest.fn().mockResolvedValue(verified) };
    guard = new PrivyAuthGuard(privy as unknown as PrivyIdentity);
  });

  it('rejects a request with no token', async () => {
    const { context } = contextFor({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(privy.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects an Authorization header that is not a bearer token', async () => {
    const { context } = contextFor({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('verifies a bearer token and attaches the principal', async () => {
    const { context, request } = contextFor({
      authorization: 'Bearer access-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(privy.verifyAccessToken).toHaveBeenCalledWith('access-token', null);
    expect(request.principal).toEqual(verified);
  });

  it('passes the identity token through when the client sends one', async () => {
    const { context } = contextFor({
      authorization: 'Bearer access-token',
      'privy-id-token': 'identity-token',
    });

    await guard.canActivate(context);

    expect(privy.verifyAccessToken).toHaveBeenCalledWith(
      'access-token',
      'identity-token',
    );
  });

  it('falls back to cookies, so the HttpOnly session mode keeps working', async () => {
    const { context } = contextFor({
      cookie:
        'other=x; privy-token=cookie-access-token; privy-id-token=cookie-identity-token',
    });

    await guard.canActivate(context);

    expect(privy.verifyAccessToken).toHaveBeenCalledWith(
      'cookie-access-token',
      'cookie-identity-token',
    );
  });
});
