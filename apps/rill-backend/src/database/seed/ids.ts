/**
 * Stable ids for catalog rows the rest of the system is allowed to mention by name
 * (`USDT`, `SwapMaster`) without a lookup that can miss. Seed is idempotent on these keys.
 */
export const CATALOG_IDS = {
  platformUser: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  platformDeveloper: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  assetBnb: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
  assetUsdt: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
  assetUsdc: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
  assetWbnb: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13',
  assetU: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa14',
  protocolPancake: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa20',
  pancakeRouter: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
  protocolAave: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa40',
  aavePool: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41',
  protocolFourMeme: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa42',
  fourMemeManager: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa43',
  agentSwapmaster: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa30',
  identitySwapmaster: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
  capabilitySwap: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
  agentRadar: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa50',
  identityRadar: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa51',
  capabilityScreen: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa52',
  agentLoan: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa53',
  identityLoan: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa54',
  capabilitySupply: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa55',
  agentRisk: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa56',
  identityRisk: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa57',
  capabilityRisk: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa58',
  agentCopy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa60',
  identityCopy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa61',
  capabilityCopy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa62',
  agentFour: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa63',
  identityFour: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa64',
  capabilityFour: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa65',
} as const;

/** BSC mainnet. Native BNB uses the zero-address sentinel. */
export const BSC_CHAIN_ID = 56;

export const BSC_ADDRESSES = {
  bnb: '0x0000000000000000000000000000000000000000',
  usdt: '0x55d398326f99059ff77548524641cc36c3e50e3e',
  usdc: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  pancakeV2Router: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
  wbnb: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  /** $U (United Stables) — ERC-8183 escrow token, mainnet. */
  u: '0xce24439f2d9c6a2289f741120fe202248b666666',
  uTestnet: '0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565',
  aaveV3Pool: '0x6807dc923806fe8fd134338eabca509979a7e0cb',
  fourMemeTokenManager: '0x5c952063c7fc8610ffdb798152d69f0b9550762b',
} as const;

export const CHAIN_IDS = {
  bnb: 56,
  'bnb-testnet': 97,
  ethereum: 1,
  unspecified: 56,
} as const;
