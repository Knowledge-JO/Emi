import { Module } from '@nestjs/common';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

// TODO: The ONLY module permitted to touch Altana. It owns the client, signers, session grants
// and revocations; every other module requests wallet actions through its services and never
// constructs a signer or Session itself.
//
// One amendment from the passkey decision: a WebAuthn credential can only be created in the
// browser, so the frontend runs `createPasskeyWallet` and this module records the result. The
// rule still holds where it matters — no other backend module talks to Altana, and no signer is
// ever constructed here.
@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
