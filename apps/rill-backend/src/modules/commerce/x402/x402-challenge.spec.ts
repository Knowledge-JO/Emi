import {
  buildMerchantChallenge,
  caip2,
  decodeXPaymentHeader,
  networkToChainId,
  payerFromPayload,
  paymentNonce,
  QUOTE_PRICE,
  requirementAmount,
  resolveRail,
  resourceUrl,
  settlementToken,
} from './x402-challenge';

describe('x402 challenge helpers', () => {
  it('maps CAIP-2 and BSC aliases to chain ids', () => {
    expect(networkToChainId('eip155:56')).toBe(56);
    expect(networkToChainId('eip155:97')).toBe(97);
    expect(networkToChainId('bsc')).toBe(56);
    expect(networkToChainId('bsc-testnet')).toBe(97);
    expect(caip2(56)).toBe('eip155:56');
    expect(() => networkToChainId('solana')).toThrow(/unsupported network/);
  });

  it('resolves $U and amounts as exact strings', () => {
    expect(settlementToken(56)).toBe(
      '0xce24439f2d9c6a2289f741120fe202248b666666',
    );
    expect(settlementToken(97)).toBe(
      '0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565',
    );
    expect(requirementAmount({ amount: QUOTE_PRICE } as never)).toBe(
      QUOTE_PRICE,
    );
    expect(
      requirementAmount({ maxAmountRequired: '2' } as never),
    ).toBe('2');
    expect(() => requirementAmount({} as never)).toThrow(/amount/);
  });

  it('prefers Permit2 when the extra names it', () => {
    expect(
      resolveRail({
        scheme: 'exact',
        extra: { assetTransferMethod: 'permit2-exact' },
      } as never),
    ).toBe('permit2');
    expect(
      resolveRail({
        scheme: 'exact',
        extra: { assetTransferMethod: 'eip3009' },
      } as never),
    ).toBe('eip3009');
  });

  it('builds a v2 merchant challenge priced in 0.01 $U', () => {
    const challenge = buildMerchantChallenge({
      resourceUrl: 'http://localhost:4000/capabilities/quote',
      description: 'Swap quote',
      chainId: 56,
      asset: settlementToken(56),
      amount: QUOTE_PRICE,
      payTo: '0x1111111111111111111111111111111111111111',
    });

    expect(challenge.x402Version).toBe(2);
    expect(challenge.resource.url).toBe(
      'http://localhost:4000/capabilities/quote',
    );
    expect(challenge.accepts[0]).toMatchObject({
      scheme: 'exact',
      network: 'eip155:56',
      asset: '0xce24439f2d9c6a2289f741120fe202248b666666',
      amount: QUOTE_PRICE,
      maxAmountRequired: QUOTE_PRICE,
      payTo: '0x1111111111111111111111111111111111111111',
      extra: { assetTransferMethod: 'permit2-exact' },
    });
  });

  it('decodes payer and nonce from a base64 envelope', () => {
    const header = Buffer.from(
      JSON.stringify({
        payload: {
          from: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
          permit: { nonce: '7' },
        },
      }),
    ).toString('base64');
    const decoded = decodeXPaymentHeader(header);
    expect(payerFromPayload(decoded)).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(paymentNonce(decoded)).toBe('7');
    expect(resourceUrl({ url: 'http://localhost/capabilities/quote' })).toBe(
      'http://localhost/capabilities/quote',
    );
  });
});
