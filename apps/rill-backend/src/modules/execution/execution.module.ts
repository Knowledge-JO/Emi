import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { PancakeswapAdapter } from './adapters/pancakeswap.adapter';
import { ExecutionService } from './execution.service';
import { ChainRpcReader } from './rpc-reader';

/**
 * The only place raw calldata is built. Orchestrator stays at intent-level steps
 * ("swap 5 USDT for BNB"); this module quotes on RPC and returns { to, data, value }.
 * WalletModule restores the session and submits.
 */
@Module({
  imports: [MarketplaceModule, AgentsModule, BlockchainModule],
  providers: [ChainRpcReader, PancakeswapAdapter, ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
