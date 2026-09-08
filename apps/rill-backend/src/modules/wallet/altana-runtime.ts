/**
 * The only runtime touch of `@altananetwork/sdk` in this Nest process. The package is ESM-only,
 * so it is loaded with a dynamic import rather than a static `import` the CommonJS build cannot
 * emit. No other module may construct a signer or a Session.
 */

export const ALTANA_RUNTIME = Symbol('ALTANA_RUNTIME');

/** Canonical Permit2. Duplicated here so WalletModule does not import commerce. */
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

export type StoredSession = {
  walletAddress: string;
  publicKey: string;
  permissions: {
    calls?: Array<{ to?: string; signature?: string }>;
    spend?: Array<{ limit: string; period: string; token?: string }>;
  };
  expiry: number;
};

export type RuntimeCall = {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
};

export type RuntimeExecuteResult = {
  callsId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  transactionHash?: string;
  statusCode?: number;
};

export type RuntimeTokenBalance =
  | {
      address: string;
      ok: true;
      raw: string;
      decimals: number;
      symbol: string;
      display: string;
    }
  | { address: string; ok: false; error: string };

export type RuntimeBalances = {
  native: string;
  tokens: RuntimeTokenBalance[];
};

export type AltanaRuntime = {
  execute(input: {
    chain: 'bnb' | 'bnb-testnet' | 'ethereum';
    chainId: number;
    stored: StoredSession;
    privateKey: `0x${string}`;
    calls: RuntimeCall[];
  }): Promise<RuntimeExecuteResult>;
  balances(input: {
    chain: 'bnb' | 'bnb-testnet' | 'ethereum';
    chainId: number;
    walletAddress: string;
    tokens?: string[];
  }): Promise<RuntimeBalances>;
  signOrder(input: {
    stored: StoredSession;
    privateKey: `0x${string}`;
    appDigest: `0x${string}`;
  }): Promise<`0x${string}`>;
  fetchWithX402(input: {
    stored: StoredSession;
    privateKey: `0x${string}`;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    chainId: number;
  }): Promise<RuntimeX402FetchResult>;
  x402ProvisionCalls(input: {
    stored: StoredSession;
    privateKey: `0x${string}`;
    token: `0x${string}`;
  }): Promise<RuntimeCall[]>;
};

export type RuntimeX402FetchResult = {
  status: number;
  body: string;
  contentType: string | null;
  paid: boolean;
  asset?: string;
  amount?: string;
  payTo?: string;
  rail?: 'permit2' | 'eip3009';
  paymentNonce?: string;
  payerAddress?: string;
  scheme?: string;
  network?: string;
};

export const liveAltanaRuntime: AltanaRuntime = {
  async execute(input) {
    const { client, session } = await restoreClient(input);
    const result = await client.execute({
      session,
      calls: input.calls,
      chainId: input.chainId,
    });
    return {
      callsId: result.callsId,
      status: result.status,
      transactionHash: result.transactionHash,
      statusCode: result.statusCode,
    };
  },

  async balances(input) {
    const { client } = await loadClient(input.chain);
    const result = await client.balances({
      wallet: input.walletAddress as `0x${string}`,
      tokens: input.tokens as `0x${string}`[] | undefined,
      chainId: input.chainId,
    });
    return {
      native: result.native.toString(),
      tokens: (result.tokens ?? []).map((token) =>
        token.ok
          ? {
              address: token.address,
              ok: true as const,
              raw: token.raw.toString(),
              decimals: token.decimals,
              symbol: token.symbol,
              display: token.display,
            }
          : {
              address: token.address,
              ok: false as const,
              error: token.error,
            },
      ),
    };
  },

  async signOrder(input) {
    const { client, session } = await restoreClient(input);
    return client.signOrder({ session, appDigest: input.appDigest });
  },

  async fetchWithX402(input) {
    const { sdk, session } = await restoreClient(input);
    const init: RequestInit = {
      method: input.method ?? 'GET',
      headers: input.headers,
      body: input.body,
    };
    const first = await fetch(input.url, init);
    if (first.status !== 402) {
      return {
        status: first.status,
        body: await first.text(),
        contentType: first.headers.get('content-type'),
        paid: false,
      };
    }

    const challenge = (await first.json()) as {
      accepts?: unknown[];
      scheme?: string;
      x402Version?: number;
      resource?: unknown;
      mimeType?: string;
    };
    const rawOptions = Array.isArray(challenge.accepts)
      ? challenge.accepts
      : challenge.scheme
        ? [challenge]
        : [];
    const resource = sdk.normalizeResource(challenge.resource, input.url);
    const options = rawOptions.map((option) => {
      const item = option as Record<string, unknown>;
      return {
        x402Version: item.x402Version ?? challenge.x402Version,
        ...(resource ? { resource } : {}),
        ...(typeof challenge.mimeType === 'string'
          ? { mimeType: challenge.mimeType }
          : {}),
        ...item,
      };
    });
    const requirement = sdk.selectX402Requirement(
      options as Parameters<typeof sdk.selectX402Requirement>[0],
      { chainId: input.chainId, preferRail: 'permit2' },
    );
    if (!requirement) {
      throw new Error('x402: 402 response offered no payable option');
    }

    const { header, payload } = await sdk.signX402Payment(session, requirement);
    const headers = new Headers(init.headers);
    headers.set('X-PAYMENT', header);
    headers.set('PAYMENT-SIGNATURE', header);
    const paid = await fetch(input.url, { ...init, headers });

    const inner = payload.payload as Record<string, unknown>;
    const permit = inner.permit as { nonce?: string } | undefined;
    const auth = inner.authorization as { nonce?: string } | undefined;
    const method = requirement.extra?.assetTransferMethod;
    const rail: 'permit2' | 'eip3009' =
      method === 'eip3009' || (requirement.scheme === 'exact' && method !== 'permit2-exact' && method !== 'permit2')
        ? 'eip3009'
        : 'permit2';

    return {
      status: paid.status,
      body: await paid.text(),
      contentType: paid.headers.get('content-type'),
      paid: true,
      asset: requirement.asset.toLowerCase(),
      amount: requirement.amount ?? requirement.maxAmountRequired,
      payTo: requirement.payTo.toLowerCase(),
      rail,
      paymentNonce: permit?.nonce ?? auth?.nonce,
      payerAddress: session.walletAddress.toLowerCase(),
      scheme: requirement.scheme,
      network: requirement.network,
    };
  },

  async x402ProvisionCalls(input) {
    const { session } = await restoreClient(input);
    const {
      encodeAbiParameters,
      encodeFunctionData,
      keccak256,
      maxUint256,
      padHex,
    } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const sessionAddress = privateKeyToAccount(input.privateKey).address;
    // IthacaAccount keyHash for a secp256k1 session (KeyType = 2).
    const keyHash = keccak256(
      encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'bytes32' }],
        [2n, keccak256(padHex(sessionAddress, { size: 32 }))],
      ),
    );
    const approveData = encodeFunctionData({
      abi: [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'approve',
      args: [PERMIT2, maxUint256],
    });
    const checkerData = encodeFunctionData({
      abi: [
        {
          name: 'setSignatureCheckerApproval',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'keyHash', type: 'bytes32' },
            { name: 'checker', type: 'address' },
            { name: 'isApproved', type: 'bool' },
          ],
          outputs: [],
        },
      ],
      functionName: 'setSignatureCheckerApproval',
      args: [keyHash, PERMIT2, true],
    });
    return [
      { to: input.token, data: approveData, value: 0n },
      {
        to: session.walletAddress as `0x${string}`,
        data: checkerData,
        value: 0n,
      },
    ];
  },
};

async function restoreClient(input: {
  chain?: 'bnb' | 'bnb-testnet' | 'ethereum';
  stored: StoredSession;
  privateKey: `0x${string}`;
}) {
  const { client, sdk } = await loadClient(input.chain ?? 'bnb');
  const session = sdk.deserializeSession(
    input.stored as Parameters<typeof sdk.deserializeSession>[0],
    sdk.signerFromPrivateKey(input.privateKey),
  );
  return { client, session, sdk };
}

async function loadClient(chain: 'bnb' | 'bnb-testnet' | 'ethereum') {
  const sdk = await import('@altananetwork/sdk');
  const network =
    chain === 'bnb-testnet'
      ? sdk.BNB_TESTNET
      : chain === 'ethereum'
        ? sdk.ETHEREUM
        : sdk.BNB;
  return { sdk, client: sdk.createClient({ chains: [network] }) };
}
