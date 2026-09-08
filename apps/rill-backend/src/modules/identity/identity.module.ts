import { Module } from '@nestjs/common';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { AgentIdentityService } from './agent-identity.service';
import { ERC8004_CHAIN_READER } from './erc8004-read';
import { Erc8004RegistryService } from './erc8004-registry.service';
import { IdentityCardService } from './identity-card.service';
import { IdentityController } from './identity.controller';
import { ViemErc8004ChainReader } from './viem-erc8004-reader';

/**
 * ERC-8004 agent identity. Identity feeds commerce:
 *   ERC-8004 → agent identity → marketplace → ERC-8183 / x402
 *
 * Reads go to the registry over viem. Writes are encoded calldata for a later session.
 * This module does not import WalletModule or MarketplaceModule.
 */
@Module({
  imports: [BlockchainModule],
  controllers: [IdentityController],
  providers: [
    AgentIdentityService,
    Erc8004RegistryService,
    IdentityCardService,
    { provide: ERC8004_CHAIN_READER, useClass: ViemErc8004ChainReader },
  ],
  exports: [AgentIdentityService, Erc8004RegistryService],
})
export class IdentityModule {}
