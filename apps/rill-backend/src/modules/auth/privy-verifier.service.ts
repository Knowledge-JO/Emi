import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, verifyIdentityToken } from '@privy-io/node';

import type { RillConfigService } from '../../config/app.config';
import type {
  PrivyIdentity,
  PrivyPrincipal,
  PrivyProfile,
} from './privy-identity.interface';

/**
 * The only place in the backend that talks to Privy. Verification is done in-process against the
 * app's public key, so an authenticated request costs no network round trip and the API never
 * needs the Privy app secret.
 */
@Injectable()
export class PrivyVerifierService implements PrivyIdentity {
  private readonly logger = new Logger(PrivyVerifierService.name);
  private readonly appId: string;
  private readonly verificationKey: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    this.appId = config.get('privy.appId', { infer: true });
    this.verificationKey = config.get('privy.verificationKey', { infer: true });
  }

  async verifyAccessToken(
    accessToken: string,
    identityToken: string | null,
  ): Promise<PrivyPrincipal> {
    try {
      const claims = await verifyAccessToken({
        access_token: accessToken,
        app_id: this.appId,
        verification_key: this.verificationKey,
      });

      return {
        did: claims.user_id,
        sessionId: claims.session_id,
        issuedAt: new Date(claims.issued_at * 1000),
        expiresAt: new Date(claims.expiration * 1000),
        unverifiedIdentityToken: identityToken,
      };
    } catch (error) {
      // Expired tokens are routine — the client refreshes and retries — so this is not worth
      // alerting on. The response stays generic; the reason belongs in logs.
      this.logger.debug(
        `Privy access token rejected: ${(error as Error).message}`,
      );
      throw new UnauthorizedException('Invalid or expired Privy access token');
    }
  }

  /**
   * Reads the user's linked accounts out of a verified identity token. Best-effort by design: if
   * the client did not send one, or it fails to verify, sign-in continues with the DID alone —
   * an email address is a convenience, not a credential.
   */
  async readProfile(identityToken: string): Promise<PrivyProfile | null> {
    try {
      const user = await verifyIdentityToken({
        identity_token: identityToken,
        app_id: this.appId,
        verification_key: this.verificationKey,
      });

      const emailAccount = user.linked_accounts.find(
        (account) => account.type === 'email',
      );
      if (emailAccount?.address) {
        return { email: emailAccount.address };
      }

      // No email login, but an OAuth account may still carry an address.
      for (const account of user.linked_accounts) {
        if (
          'email' in account &&
          typeof account.email === 'string' &&
          account.email
        ) {
          return { email: account.email };
        }
      }

      return { email: null };
    } catch (error) {
      this.logger.debug(
        `Privy identity token rejected: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
