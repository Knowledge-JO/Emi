import { Controller, Delete, HttpCode, Post, UseGuards } from '@nestjs/common';

import { UsersService, type UserResponse } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from './privy-auth.guard';
import type { PrivyPrincipal } from './privy-identity.interface';

export type SessionResponse = {
  user: UserResponse;
  session: {
    privySessionId: string;
    /** When the caller's access token expires. The client refreshes through Privy, not us. */
    expiresAt: string;
  };
};

/**
 * The frontend logs in with Privy, then hands the resulting access token to this controller. The
 * token is verified here — a client claiming to be someone is never taken at its word.
 */
@Controller('auth')
@UseGuards(PrivyAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  /** Completes sign-in and returns the account behind the token. Safe to call repeatedly. */
  @Post('session')
  @HttpCode(200)
  async createSession(
    @CurrentPrincipal() principal: PrivyPrincipal,
  ): Promise<SessionResponse> {
    const user = await this.auth.completeSignIn(principal);

    return {
      user: this.users.toResponse(user),
      session: {
        privySessionId: principal.sessionId,
        expiresAt: principal.expiresAt.toISOString(),
      },
    };
  }

  @Delete('session')
  @HttpCode(204)
  async endSession(
    @CurrentPrincipal() principal: PrivyPrincipal,
  ): Promise<void> {
    const user = await this.auth.requireUser(principal);
    await this.auth.recordSignOut(user, principal);
  }
}
