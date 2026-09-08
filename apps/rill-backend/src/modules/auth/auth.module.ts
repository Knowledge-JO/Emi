import { Global, Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrivyAuthGuard } from './privy-auth.guard';
import { PrivyIdentity } from './privy-identity.interface';
import { PrivyVerifierService } from './privy-verifier.service';

/**
 * Authentication for two caller classes: humans (Privy access token) and agents (API key
 * resolved to an ERC-8004 identity). A platform token never authorizes an on-chain action.
 *
 * Global because authentication is cross-cutting: every feature module needs the guards, and
 * making them import this module would put an import cycle between auth and users.
 */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    { provide: PrivyIdentity, useClass: PrivyVerifierService },
    PrivyAuthGuard,
    ApiKeyService,
    ApiKeyGuard,
    AuthService,
  ],
  exports: [PrivyIdentity, PrivyAuthGuard, ApiKeyService, ApiKeyGuard, AuthService],
})
export class AuthModule {}
