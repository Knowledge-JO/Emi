export type Erc8183Stack = {
  commerce: string;
  router: string;
  policy: string;
  paymentToken: string;
};

/**
 * AgenticCommerce stack from `@altananetwork/sdk` 0.9.0. Copied here because the SDK is
 * ESM-only and this CommonJS build cannot import it. `commerce` is the escrow address in env.
 */
export const ERC8183_STACK: Record<56 | 97, Erc8183Stack> = {
  56: {
    commerce: '0xea4daa3100a767e86fded867729ae7446476eba6',
    router: '0x51895229e12f9876011789b04f8698af06ccd6da',
    policy: '0x9c01845705b3078aa2e8cff7520a6376fd766de5',
    paymentToken: '0xce24439f2d9c6a2289f741120fe202248b666666',
  },
  97: {
    commerce: '0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de',
    router: '0xd7d36d66d2f1b608a0f943f722d27e3744f66f25',
    policy: '0xd6a4217588f6b1f5657a92a3e94e6422ad771cea',
    paymentToken: '0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565',
  },
};

export function erc8183Stack(chainId: number): Erc8183Stack {
  if (chainId === 56 || chainId === 97) {
    return ERC8183_STACK[chainId];
  }
  throw new Error(`ERC-8183 has no deployment on chain ${chainId}`);
}
