import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { BSC_ADDRESSES } from '../../database/seed/ids';
import {
  ALTANA_RUNTIME,
  type AltanaRuntime,
  type RuntimeBalances,
} from './altana-runtime';
import { preflightReady, type PreflightNeed } from './balance-preflight';
import { WalletService } from './wallet.service';

export type WalletBalancesResponse = {
  address: string;
  chainId: number;
  native: string;
  tokens: RuntimeBalances['tokens'];
};

/**
 * Read-only balances via the Altana client. No signer. Used to show the wallet and to refuse
 * an execute that would revert for lack of gas or spend-token.
 */
@Injectable()
export class BalancesService {
  constructor(
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(ALTANA_RUNTIME) private readonly altana: AltanaRuntime,
    private readonly wallets: WalletService,
  ) {}

  async forUser(
    userId: string,
    tokens?: string[],
  ): Promise<WalletBalancesResponse> {
    const wallet = await this.wallets.findForUser(userId);
    if (!wallet) {
      throw new NotFoundException('No wallet provisioned yet');
    }

    const wanted = (tokens ?? defaultCatalogTokens()).map((token) =>
      token.toLowerCase(),
    );
    const balances = await this.altana.balances({
      chain: this.config.get('altana.chain', { infer: true }),
      chainId: this.config.get('altana.chainId', { infer: true }),
      walletAddress: wallet.address,
      tokens: wanted,
    });

    return {
      address: wallet.address,
      chainId: this.config.get('altana.chainId', { infer: true }),
      native: balances.native,
      tokens: balances.tokens,
    };
  }

  async assertReady(
    userId: string,
    spend: PreflightNeed[],
  ): Promise<WalletBalancesResponse> {
    const tokens = spend.map((need) => need.token);
    const snapshot = await this.forUser(userId, tokens);
    const check = preflightReady(
      {
        native: BigInt(snapshot.native),
        tokens: snapshot.tokens.map((token) =>
          token.ok
            ? { address: token.address.toLowerCase(), raw: BigInt(token.raw) }
            : { address: token.address.toLowerCase(), raw: null },
        ),
      },
      spend,
    );
    if (!check.ok) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: check.code,
        error: check.error,
      });
    }
    return snapshot;
  }
}

function defaultCatalogTokens(): string[] {
  return [BSC_ADDRESSES.usdt, BSC_ADDRESSES.usdc];
}
