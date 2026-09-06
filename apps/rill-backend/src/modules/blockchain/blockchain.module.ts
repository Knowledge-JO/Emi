import { Module } from '@nestjs/common';

// TODO: Chain access — viem public clients, the Keystore reader, the indexer and transaction
// tracking. Read-only by design: signing belongs to the wallet module.
@Module({})
export class BlockchainModule {}
