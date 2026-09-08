import { Controller, Get, Param } from '@nestjs/common';

import { KeystoreService } from './keystore.service';

/**
 * Third-party verification of on-chain authority. Public on purpose: a wallet that has never
 * heard of Rill can still check `isValidKey`. Writes stay in WalletModule.
 */
@Controller('chain')
export class ChainController {
  constructor(private readonly keystore: KeystoreService) {}

  @Get('keystore/:user/keys')
  getKeys(@Param('user') user: string) {
    return this.keystore.getKeys(user);
  }

  @Get('keystore/:user/:keyId')
  isValidKey(@Param('user') user: string, @Param('keyId') keyId: string) {
    return this.keystore.isValidKey(user, keyId);
  }
}
