import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { NATIVE_ASSET_ADDRESS } from '../../database/schema/assets';
import { BSC_ADDRESSES, CHAIN_IDS } from '../../database/seed/ids';
import { SkillRegistryService } from '../agents/skills/skill-registry.service';
import { CatalogService } from '../marketplace/catalog.service';
import { PancakeswapAdapter } from './adapters/pancakeswap.adapter';
import type { ProtocolCalls } from './protocol-adapter.interface';

export type ExecutionStep = {
  skillId: string | null;
  taxonomyKey: string;
  input: Record<string, unknown>;
};

/**
 * Turn an intent-level step into calldata. Never signs. WalletModule restores the session
 * and submits whatever this returns, after a second allowlist check.
 */
@Injectable()
export class ExecutionService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly skills: SkillRegistryService,
    private readonly pancake: PancakeswapAdapter,
  ) {}

  async buildCalls(input: {
    step: ExecutionStep;
    recipient: string;
    allowlist: string[];
    sessionExpiry: number;
  }): Promise<ProtocolCalls> {
    const skillId = input.step.skillId;
    const skill = skillId
      ? this.skills.get(skillId)
      : this.skills.forTaxonomy(input.step.taxonomyKey);

    if (!skill || skill.id !== 'pancakeswap-trading') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'skill_not_executable',
        error: skill
          ? `${skill.id} has no execute play yet`
          : 'No skill is bound to this step',
      });
    }

    await this.skills.confirmUpstream(skill.id);

    const fromSymbol = stringField(input.step.input, 'fromSymbol');
    const toSymbol = stringField(input.step.input, 'toSymbol');
    const amount = stringField(input.step.input, 'amount');
    if (!fromSymbol || !toSymbol || !amount) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'swap_input_incomplete',
        error: 'Swap step needs fromSymbol, toSymbol and amount',
      });
    }

    const chainId = chainIdFor(stringField(input.step.input, 'chain'));
    const { rows } = await this.catalog.findAssetsBySymbols(chainId, [
      fromSymbol,
      toSymbol,
      'WBNB',
    ]);
    const tokenIn = rows.find((row) => row.symbol === fromSymbol.toUpperCase());
    const tokenOut = rows.find((row) => row.symbol === toSymbol.toUpperCase());
    if (!tokenIn || !tokenOut) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'swap_asset_unknown',
        error: 'A swap token is not in the catalog',
      });
    }

    const built = await this.pancake.buildEnterPosition({
      step: { fromSymbol, toSymbol, amount },
      tokenIn,
      tokenOut,
      router:
        skill.addressTable.pancakeV2Router ?? BSC_ADDRESSES.pancakeV2Router,
      wbnb: skill.addressTable.wbnb ?? BSC_ADDRESSES.wbnb,
      native: NATIVE_ASSET_ADDRESS,
      recipient: input.recipient,
      allowlist: input.allowlist,
      sessionExpiry: input.sessionExpiry,
    });

    return {
      play: built.play,
      protocolSlug: 'pancakeswap',
      calls: built.calls,
      quote: built.quote,
    };
  }
}

function stringField(
  input: Record<string, unknown>,
  key: string,
): string | null {
  const value = input[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function chainIdFor(chain: string | null): number {
  if (chain === 'bnb' || chain === 'bnb-testnet' || chain === 'ethereum') {
    return CHAIN_IDS[chain];
  }
  return CHAIN_IDS.unspecified;
}
