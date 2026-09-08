import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { ALTANA_RUNTIME, liveAltanaRuntime } from './altana-runtime';
import { BalancesService } from './balances.service';
import { PermissionService } from './permission.service';
import { SignatureService } from './signature.service';
import {
  FileSessionSecretStore,
  MemorySessionSecretStore,
  SessionSecretStore,
} from './session-secret.store';
import { SessionStoreService } from './session-store.service';
import { SessionService } from './session.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { X402SessionService } from './x402-session.service';

/**
 * The ONLY module permitted to touch Altana. Session grants and revokes happen in the
 * browser (passkey admin signer); this module records them, restores sessions for execute
 * and signOrder, and reads balances. No other module constructs a signer or a Session.
 */
@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    PermissionService,
    SessionStoreService,
    SessionService,
    BalancesService,
    SignatureService,
    X402SessionService,
    { provide: ALTANA_RUNTIME, useValue: liveAltanaRuntime },
    {
      provide: SessionSecretStore,
      inject: [ConfigService],
      useFactory: (config: RillConfigService) => {
        if (config.get('app.env', { infer: true }) === 'test') {
          return new MemorySessionSecretStore();
        }
        const provider = config.get('altana.secretProvider', { infer: true });
        if (provider === 'file' || provider === 'env') {
          return new FileSessionSecretStore(
            config.get('altana.secretDir', { infer: true }),
          );
        }
        throw new Error(
          `SESSION_SECRET_PROVIDER=${provider} is not implemented; use file`,
        );
      },
    },
  ],
  exports: [
    WalletService,
    SessionService,
    BalancesService,
    SignatureService,
    X402SessionService,
  ],
})
export class WalletModule {}
