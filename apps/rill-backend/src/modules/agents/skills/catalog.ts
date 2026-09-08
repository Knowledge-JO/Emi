import { BSC_ADDRESSES } from '../../../database/seed/ids';

const SOURCE = 'https://github.com/altananetwork/skills/blob/main/skills';

export type SkillCategory =
  'Trading' | 'Lending' | 'Research' | 'Liquidity' | 'Payments' | 'Staking';

export type SkillRecord = {
  id: string;
  name: string;
  description: string;
  source: string;
  chain: 'bnb';
  category: SkillCategory;
  taxonomyKeys: string[];
  /** Writes go through an Altana session. Research skills never write. */
  writeOnchain: boolean;
  /** Addresses the playbook names. Not all of these are session call targets. */
  addressTable: Record<string, string>;
  /** Session `calls`. Empty means zero-scope — safe for research, fatal if paired with spend. */
  callAddresses: string[];
  may: string[];
  mayNot: string[];
};

const usdt = BSC_ADDRESSES.usdt;
const router = BSC_ADDRESSES.pancakeV2Router;
const wbnb = BSC_ADDRESSES.wbnb;

/**
 * Competence catalog. These are Altana registry skills (public playbooks), not marketplace
 * listings and not sessions. The playbook lives upstream; we keep the id, the published scope,
 * and the taxonomy a capability matches.
 *
 * https://github.com/altananetwork/skills
 */
export const SKILLS: SkillRecord[] = [
  {
    id: 'pancakeswap-trading',
    name: 'PancakeSwap Trading',
    description:
      'Buy and sell tokens on PancakeSwap on BNB Chain through an Altana session.',
    source: `${SOURCE}/pancakeswap-trading/SKILL.md`,
    chain: 'bnb',
    category: 'Trading',
    taxonomyKeys: ['defi.swap'],
    writeOnchain: true,
    addressTable: {
      pancakeV2Router: router,
      wbnb,
      usdt,
    },
    // Official grant example: router + USDT. WBNB is a path token, not a call target.
    callAddresses: [router],
    may: ['Trade on PancakeSwap', 'Spend up to the cap you set'],
    mayNot: ['Send funds anywhere else', 'Touch any other app or token'],
  },
  {
    id: 'aave-v3-lending',
    name: 'Aave V3 Lending',
    description:
      'Supply USDT to Aave V3 on BNB Chain to earn yield, and withdraw on command.',
    source: `${SOURCE}/aave-v3-lending/SKILL.md`,
    chain: 'bnb',
    category: 'Lending',
    taxonomyKeys: ['defi.lending.supply', 'defi.lending.withdraw'],
    writeOnchain: true,
    addressTable: {
      pool: '0x6807dc923806fe8fd134338eabca509979a7e0cb',
      aBnbUsdt: '0xa9251ca9de909cb71783723713b21e4233fbf1b1',
      usdt,
    },
    callAddresses: ['0x6807dc923806fe8fd134338eabca509979a7e0cb'],
    may: [
      'Supply USDT to Aave V3',
      'Withdraw your position',
      'Spend up to the cap you set',
    ],
    mayNot: [
      'Borrow',
      'Send funds anywhere else',
      'Touch any other app or token',
    ],
  },
  {
    id: 'four-meme',
    name: 'Four.meme Trading',
    description:
      'Buy and sell memecoins on Four.meme bonding curves on BNB Chain through an Altana session.',
    source: `${SOURCE}/four-meme/SKILL.md`,
    chain: 'bnb',
    category: 'Trading',
    taxonomyKeys: ['defi.launchpad.swap'],
    writeOnchain: true,
    addressTable: {
      tokenManager2: '0x5c952063c7fc8610ffdb798152d69f0b9550762b',
      tokenManagerHelper3: '0xf251f83e40a78868fcfa3fa4599dad6494e46034',
      pancakeV2Router: router,
      wbnb,
    },
    callAddresses: ['0x5c952063c7fc8610ffdb798152d69f0b9550762b', router],
    may: [
      'Buy and sell on Four.meme curves',
      'Spend BNB up to the cap you set',
    ],
    mayNot: ['Send funds anywhere else', 'Touch any other app or token'],
  },
  {
    id: 'copy-trade',
    name: 'Copy Trade',
    description:
      "Mirror a chosen wallet's PancakeSwap trades under hard session caps.",
    source: `${SOURCE}/copy-trade/SKILL.md`,
    chain: 'bnb',
    category: 'Trading',
    taxonomyKeys: ['defi.copy_trade'],
    writeOnchain: true,
    addressTable: {
      pancakeV2Router: router,
      pancakeV2Factory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      wbnb,
      usdt,
    },
    callAddresses: [router],
    may: [
      'Mirror the PancakeSwap trades of the wallet you name',
      'Spend up to the caps you set',
    ],
    mayNot: [
      'Follow any wallet you did not give it',
      'Exceed per-trade or total caps',
      'Send funds anywhere else',
      'Touch any other app',
    ],
  },
  {
    id: 'dexscreener-token-radar',
    name: 'Token Radar',
    description:
      'Find trending BNB Chain tokens and screen them for liquidity and risk before trading.',
    source: `${SOURCE}/dexscreener-token-radar/SKILL.md`,
    chain: 'bnb',
    category: 'Research',
    taxonomyKeys: ['research.screen'],
    writeOnchain: false,
    addressTable: {},
    callAddresses: [],
    may: ['Read public market data', 'Screen tokens and report risks'],
    mayNot: ['Submit any transaction', 'Touch any contract or token'],
  },
];

export type SkillSummary = {
  id: string;
  name: string;
  source: string;
  category: SkillCategory;
  writeOnchain: boolean;
  may: string[];
  mayNot: string[];
};

export function toSkillSummary(skill: SkillRecord): SkillSummary {
  return {
    id: skill.id,
    name: skill.name,
    source: skill.source,
    category: skill.category,
    writeOnchain: skill.writeOnchain,
    may: skill.may,
    mayNot: skill.mayNot,
  };
}
