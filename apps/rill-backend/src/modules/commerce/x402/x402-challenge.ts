export const PERMIT2_ADDRESS = '0x000000000022d473030f116ddee9f6b43ac78ba3';

/** 0.01 $U (18 decimals). Same price for Rill's first paid capabilities. */
export const QUOTE_PRICE = '10000000000000000';

const SETTLEMENT_TOKEN: Record<56 | 97, string> = {
  56: '0xce24439f2d9c6a2289f741120fe202248b666666',
  97: '0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565',
};

export function settlementToken(chainId: number): string {
  if (chainId === 56 || chainId === 97) return SETTLEMENT_TOKEN[chainId];
  throw new Error(`x402: no $U address on chain ${chainId}`);
}

export type X402Resource = {
  url: string;
  description?: string;
  mimeType?: string;
};

export type X402Requirement = {
  scheme: string;
  network: string;
  asset: string;
  amount?: string;
  maxAmountRequired?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  x402Version?: number;
  resource?: X402Resource | string;
  extra?: {
    assetTransferMethod?: string;
    spender?: string;
    spenderAddress?: string;
    name?: string;
    version?: string;
  };
};

export type X402Challenge = {
  x402Version: number;
  resource: X402Resource;
  accepts: X402Requirement[];
};

export type DecodedXPayment = {
  x402Version?: number;
  scheme?: string;
  network?: string;
  accepted?: X402Requirement;
  resource?: X402Resource | string;
  payload?: Record<string, unknown>;
};

export function networkToChainId(network: string): number {
  const caip2 = /^eip155:(\d+)$/.exec(network);
  if (caip2) return Number(caip2[1]);
  switch (network) {
    case 'bsc':
    case 'binance':
    case 'bnb':
      return 56;
    case 'bsc-testnet':
    case 'bnb-testnet':
      return 97;
    case 'ethereum':
    case 'mainnet':
      return 1;
    default:
      throw new Error(`x402: unsupported network "${network}"`);
  }
}

export function caip2(chainId: number): string {
  return `eip155:${chainId}`;
}

export function requirementAmount(req: {
  amount?: string;
  maxAmountRequired?: string;
}): string {
  const amount = req.amount ?? req.maxAmountRequired;
  if (!amount || !/^\d+$/.test(amount)) {
    throw new Error('x402: requirement is missing an amount');
  }
  return amount;
}

export function resolveRail(req: X402Requirement): 'permit2' | 'eip3009' {
  const method = req.extra?.assetTransferMethod;
  if (method === 'permit2-exact' || method === 'permit2') return 'permit2';
  if (method === 'eip3009') return 'eip3009';
  if (req.scheme === 'permit2') return 'permit2';
  if (req.scheme === 'exact') return 'eip3009';
  throw new Error(`x402: cannot resolve rail for scheme "${req.scheme}"`);
}

export function resourceUrl(resource: X402Resource | string | undefined): string | null {
  if (typeof resource === 'string' && resource.length > 0) return resource;
  if (resource && typeof resource === 'object' && resource.url) return resource.url;
  return null;
}

export function decodeXPaymentHeader(header: string): DecodedXPayment {
  const json = Buffer.from(header, 'base64').toString('utf8');
  return JSON.parse(json) as DecodedXPayment;
}

export function paymentNonce(decoded: DecodedXPayment): string | null {
  const inner = decoded.payload ?? {};
  const permit = inner.permit as { nonce?: string } | undefined;
  const auth = inner.authorization as { nonce?: string } | undefined;
  return permit?.nonce ?? auth?.nonce ?? null;
}

export function payerFromPayload(decoded: DecodedXPayment): string | null {
  const inner = decoded.payload ?? {};
  if (typeof inner.from === 'string') return inner.from.toLowerCase();
  const auth = inner.authorization as { from?: string } | undefined;
  return auth?.from?.toLowerCase() ?? null;
}

export function buildMerchantChallenge(input: {
  resourceUrl: string;
  description: string;
  chainId: number;
  asset: string;
  amount: string;
  payTo: string;
  spender?: string;
}): X402Challenge {
  return {
    x402Version: 2,
    resource: { url: input.resourceUrl, description: input.description },
    accepts: [
      {
        scheme: 'exact',
        network: caip2(input.chainId),
        asset: input.asset.toLowerCase(),
        amount: input.amount,
        maxAmountRequired: input.amount,
        payTo: input.payTo.toLowerCase(),
        maxTimeoutSeconds: 3600,
        extra: {
          assetTransferMethod: 'permit2-exact',
          ...(input.spender
            ? { spenderAddress: input.spender.toLowerCase() }
            : {}),
        },
      },
    ],
  };
}
