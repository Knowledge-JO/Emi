import { BSC_ADDRESSES } from '../../database/seed/ids';
import { buildPancakeSwapCalls } from './pancakeswap-swap';
import type { QuoteReader } from './rpc-reader';

const usdt = {
  address: BSC_ADDRESSES.usdt,
  decimals: 18,
  isNative: false,
};

const bnb = {
  address: BSC_ADDRESSES.bnb,
  decimals: 18,
  isNative: true,
};

const usdc = {
  address: BSC_ADDRESSES.usdc,
  decimals: 18,
  isNative: false,
};

const allowlist = [BSC_ADDRESSES.pancakeV2Router, BSC_ADDRESSES.usdt];
const recipient = '0x1111111111111111111111111111111111111111';

function quotes(routes: Record<string, bigint>): QuoteReader {
  return {
    getAmountsOut: (_router, amountIn, path) => {
      const key = path.join('>');
      const amountOut = routes[key];
      if (amountOut == null) {
        return Promise.reject(new Error(`no pool ${key}`));
      }
      return Promise.resolve([amountIn, amountOut]);
    },
  };
}

describe('buildPancakeSwapCalls', () => {
  it('quotes USDT → WBNB and allowlists approve + swap', async () => {
    const built = await buildPancakeSwapCalls(
      quotes({
        [`${BSC_ADDRESSES.usdt}>${BSC_ADDRESSES.wbnb}`]: 10n ** 16n,
      }),
      {
        router: BSC_ADDRESSES.pancakeV2Router,
        wbnb: BSC_ADDRESSES.wbnb,
        native: BSC_ADDRESSES.bnb,
        tokenIn: usdt,
        tokenOut: bnb,
        amountIn: 5n * 10n ** 18n,
        recipient,
        allowlist,
        slippageBps: 50,
        deadline: 1_700_000_600,
      },
    );

    expect(built.play).toBe('enter-position');
    expect(built.quote.unwrapToNative).toBe(true);
    expect(built.quote.path).toEqual([BSC_ADDRESSES.usdt, BSC_ADDRESSES.wbnb]);
    expect(built.quote.amountOutMin).toBe('9950000000000000');
    expect(built.calls).toHaveLength(2);
    expect(built.calls[0]?.to).toBe(BSC_ADDRESSES.usdt);
    expect(built.calls[1]?.to).toBe(BSC_ADDRESSES.pancakeV2Router);
    expect(built.calls[0]?.data.startsWith('0x')).toBe(true);
    expect(built.calls[1]?.data.startsWith('0x')).toBe(true);
  });

  it('picks the WBNB hop when it quotes better than the direct pair', async () => {
    const built = await buildPancakeSwapCalls(
      quotes({
        [`${BSC_ADDRESSES.usdt}>${BSC_ADDRESSES.usdc}`]: 1n,
        [`${BSC_ADDRESSES.usdt}>${BSC_ADDRESSES.wbnb}>${BSC_ADDRESSES.usdc}`]:
          9n * 10n ** 18n,
      }),
      {
        router: BSC_ADDRESSES.pancakeV2Router,
        wbnb: BSC_ADDRESSES.wbnb,
        native: BSC_ADDRESSES.bnb,
        tokenIn: usdt,
        tokenOut: usdc,
        amountIn: 5n * 10n ** 18n,
        recipient,
        allowlist: [...allowlist, BSC_ADDRESSES.usdc],
        slippageBps: 50,
        deadline: 1_700_000_600,
      },
    );

    expect(built.quote.path).toEqual([
      BSC_ADDRESSES.usdt,
      BSC_ADDRESSES.wbnb,
      BSC_ADDRESSES.usdc,
    ]);
  });

  it('refuses a target that is not on the session allowlist', async () => {
    await expect(
      buildPancakeSwapCalls(
        quotes({
          [`${BSC_ADDRESSES.usdt}>${BSC_ADDRESSES.wbnb}`]: 10n ** 16n,
        }),
        {
          router: BSC_ADDRESSES.pancakeV2Router,
          wbnb: BSC_ADDRESSES.wbnb,
          native: BSC_ADDRESSES.bnb,
          tokenIn: usdt,
          tokenOut: bnb,
          amountIn: 5n * 10n ** 18n,
          recipient,
          allowlist: [BSC_ADDRESSES.pancakeV2Router],
          slippageBps: 50,
          deadline: 1_700_000_600,
        },
      ),
    ).rejects.toThrow('not on the session allowlist');
  });

  it('refuses native BNB as the input', async () => {
    await expect(
      buildPancakeSwapCalls(quotes({}), {
        router: BSC_ADDRESSES.pancakeV2Router,
        wbnb: BSC_ADDRESSES.wbnb,
        native: BSC_ADDRESSES.bnb,
        tokenIn: bnb,
        tokenOut: usdt,
        amountIn: 10n ** 18n,
        recipient,
        allowlist,
        slippageBps: 50,
        deadline: 1_700_000_600,
      }),
    ).rejects.toThrow('Native BNB');
  });
});
