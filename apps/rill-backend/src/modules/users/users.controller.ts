import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { UsersService, type UserResponse } from './users.service';

// TODO: PATCH /users/me, and the user's linked wallets, sessions and intent history.
@Controller('users')
@UseGuards(PrivyAuthGuard)
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Get('me')
  async me(
    @CurrentPrincipal() principal: PrivyPrincipal,
  ): Promise<UserResponse> {
    return this.users.toResponse(await this.auth.requireUser(principal));
  }
}
