import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { createChainPublicClient, type ChainPublicClient } from './chain';

export type { ChainPublicClient } from './chain';

export const CHAIN_PUBLIC_CLIENT = Symbol('CHAIN_PUBLIC_CLIENT');

/**
 * One viem public client for the configured Altana chain. Identity, escrow, quotes, the
 * Keystore reader, the indexer and the transaction tracker all share it. Reads, simulations
 * and receipts only — WalletModule still owns every signer.
 */
export const chainPublicClientProvider: FactoryProvider<ChainPublicClient> = {
  provide: CHAIN_PUBLIC_CLIENT,
  inject: [ConfigService],
  useFactory: (config: RillConfigService) =>
    createChainPublicClient(
      config.get('chain.rpcUrl', { infer: true }),
      config.get('altana.chainId', { infer: true }),
    ),
};
