import { Module } from '@nestjs/common';

import { ChainController } from './chain.controller';
import {
  CHAIN_PUBLIC_CLIENT,
  chainPublicClientProvider,
} from './chain-client.provider';
import { IndexerService } from './indexer.service';
import { KeystoreService } from './keystore.service';
import { TransactionService } from './transaction.service';

/**
 * Chain access — viem public clients, the Keystore reader, the indexer and transaction
 * tracking. Read-only by design: signing belongs to the wallet module.
 */
@Module({
  controllers: [ChainController],
  providers: [
    chainPublicClientProvider,
    KeystoreService,
    IndexerService,
    TransactionService,
  ],
  exports: [CHAIN_PUBLIC_CLIENT, KeystoreService, TransactionService],
})
export class BlockchainModule {}
