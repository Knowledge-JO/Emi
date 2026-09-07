import { Global, Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrivyAuthGuard } from './privy-auth.guard';
import { PrivyIdentity } from './privy-identity.interface';
import { PrivyVerifierService } from './privy-verifier.service';

/**
 * Authentication for two very different caller classes: humans, who log in with Privy on the
 * frontend and send an access token, and agents, who present an API key resolved to an ERC-8004
 * identity. Only the first half exists so far.
 *
 * Global because authentication is cross-cutting: every feature module needs the guard, and
 * making them import this module would put an import cycle between auth and users.
 */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    { provide: PrivyIdentity, useClass: PrivyVerifierService },
    PrivyAuthGuard,
    AuthService,
  ],
  exports: [PrivyIdentity, PrivyAuthGuard, AuthService],
})
export class AuthModule {}
