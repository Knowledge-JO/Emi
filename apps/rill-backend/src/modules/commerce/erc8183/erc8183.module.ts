import { Module } from '@nestjs/common';

import { WalletModule } from '../../wallet/wallet.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { DeliverableService } from './deliverable.service';
import { DisputeService } from './dispute.service';
import { ERC8183_CHAIN_READER } from './erc8183-read';
import { JobAccess } from './job-access';
import { JobCallerGuard } from './job-caller.guard';
import { JobEscrowService } from './job-escrow.service';
import { JobsController } from './jobs.controller';
import { SettlementService } from './settlement.service';
import { ViemErc8183ChainReader } from './viem-erc8183-reader';

/**
 * ERC-8183 job escrow. Separate module and tables from x402. Never hire for one API request.
 * Reads are viem; writes are encoded calls executed by WalletModule.
 */
@Module({
  imports: [WalletModule, BlockchainModule],
  controllers: [JobsController],
  providers: [
    JobAccess,
    JobCallerGuard,
    JobEscrowService,
    DeliverableService,
    SettlementService,
    DisputeService,
    { provide: ERC8183_CHAIN_READER, useClass: ViemErc8183ChainReader },
  ],
  exports: [JobEscrowService],
})
export class Erc8183Module {}
