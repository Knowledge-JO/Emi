export interface AgentMatch {
  id: string;
  handle: string;
  protocol: string;
  role: string;
  reputation: number;
  jobsCompleted: number;
  fee: string;
  selected: boolean;
  why: string;
}

export interface PlanAction {
  id: string;
  label: string;
  agent: string;
  protocol: string;
  detail: string;
}

export interface CostBreakdown {
  quoted: string;
  gas: string;
  x402Fee: string;
  agentCommission: string;
}

export interface PermissionScope {
  maxSpend: string;
  expiry: string;
  protocols: string[];
  scope: string;
}

export interface MarketPlan {
  id: string;
  intent: string;
  agents: AgentMatch[];
  actions: PlanAction[];
  cost: CostBreakdown;
  permission: PermissionScope;
}

export interface TraceStep {
  id: string;
  label: string;
  detail: string;
}

export interface JobReceipt {
  txHash: string;
  actualCost: string;
  quotedCost: string;
  gas: string;
  explorerUrl: string;
  result?: SwapResult;
}

export type Intents = "venus-protect" | "swap-bnb-usdt" | "cake-liquidity";

export interface ClarifyingChoice {
  id: string;
  amount: string;
}

interface ResolvedIntent {
  kind: "plan";
  intentKey: Intents;
  amountLabel: string;
}

export const SWAP_CLARIFYING = {
  question: "Swap BNB for USDT - how much, and what max slippage will you accept?",
  choices: [
    { id: "0.5-1.5", amount: "0.5 BNB · 1.5% slippage" },
    { id: "1.2-1.0", amount: "1.2 BNB · 1.0% slippage" },
    { id: "5-0.5", amount: "5 BNB · 0.5% slippage" },
  ],
};

export interface SwapIntent {
  amount: string | null;
  from: string;
  to: string;
}

export interface SwapResult {
  out: string;
  into: string;
  rate: string;
}

const SWAP_TOKENS = /\b(usdt|usd|busd|bnb|cake)\b/;
const USD_PRICE: Record<string, number> = { USDT: 1, BUSD: 1, BNB: 489, CAKE: 1.84 };

function money(v: number): string {
  return v < 0.1 ? `$${v.toFixed(3)}` : `$${v.toFixed(2)}`;
}

function qty(v: number, max = 4): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: max });
}

export function parseSwap(raw: string): SwapIntent | null {
  const t = raw.toLowerCase();
  if (!t.includes("swap")) return null;
  const toks: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SWAP_TOKENS.source, "g");
  while ((m = re.exec(t))) toks.push(m[1].toUpperCase() === "USD" ? "USDT" : m[1].toUpperCase());
  const from = toks[0] ?? "USDT";
  const to = toks[1] ?? (from === "USDT" ? "BNB" : "USDT");
  const amount = t.match(/\d+(?:\.\d+)?/)?.[0] ?? null;
  return { amount, from, to };
}

function swapPlan(s: SwapIntent, amountLabel?: string): MarketPlan {
  const amount = s.amount ?? amountLabel?.split(" · ")[0]?.match(/\d+(?:\.\d+)?/)?.[0] ?? "5";
  const slippage = amountLabel?.match(/(\d+(?:\.\d+)?%)\s*slippage/)?.[1] ?? "0.5%";
  const { from, to } = s;
  const notional = parseFloat(amount) * (USD_PRICE[from] ?? 1);
  const gas = 0.21;
  const x402 = notional * 0.007;
  const agent = notional * 0.004 + 0.05;

  return {
    id: "SWP-042",
    intent: `Swap ${amount} ${from} for ${to}`,
    agents: [
      {
        id: "pcs-router",
        handle: "@pancake-router-v3",
        protocol: "PancakeSwap",
        role: "Routing",
        reputation: 99.1,
        jobsCompleted: 14200,
        fee: "0.05%",
        selected: true,
        why: "Best locked route · 1.2% better than runner-up quote",
      },
      {
        id: "thena-keeper",
        handle: "@thena-liquidity-keeper",
        protocol: "Thena",
        role: "Routing",
        reputation: 93.2,
        jobsCompleted: 3400,
        fee: "0.08%",
        selected: false,
        why: "Competing route quoted 0.08% vs 0.05% selected",
      },
    ],
    actions: [
      {
        id: "a1",
        label: "Quote best route",
        agent: "@pancake-router-v3",
        protocol: "PancakeSwap",
        detail: `DEX pool scan · gas-aware routing for ${from} → ${to}`,
      },
      {
        id: "a2",
        label: `Swap ${amount} ${from} for ${to}`,
        agent: "@pancake-router-v3",
        protocol: "PancakeSwap",
        detail: `Max slippage ${slippage}`,
      },
    ],
    cost: {
      quoted: money(gas + x402 + agent),
      gas: money(gas),
      x402Fee: money(x402),
      agentCommission: money(agent),
    },
    permission: {
      maxSpend: money(notional * 1.15),
      expiry: "1 hour",
      protocols: ["PancakeSwap"],
      scope: "swapExactIn · permit2-permit",
    },
  };
}

export function swapQuestionFor(from: string, to: string): string {
  return `Swap ${from} for ${to} - how much, and what max slippage will you accept?`;
}

export function swapChoicesFor(from: string): ClarifyingChoice[] {
  if (from === "BNB") {
    return [
      { id: "0.5-1.5", amount: "0.5 BNB · 1.5% slippage" },
      { id: "1.2-1.0", amount: "1.2 BNB · 1.0% slippage" },
      { id: "5-0.5", amount: "5 BNB · 0.5% slippage" },
    ];
  }
  if (from === "CAKE") {
    return [
      { id: "50-1.0", amount: "50 CAKE · 1.0% slippage" },
      { id: "200-0.8", amount: "200 CAKE · 0.8% slippage" },
      { id: "500-0.5", amount: "500 CAKE · 0.5% slippage" },
    ];
  }
  return [
    { id: "5-0.5", amount: "5 USDT · 0.5% slippage" },
    { id: "50-1.0", amount: "50 USDT · 1.0% slippage" },
    { id: "150-0.8", amount: "150 USDT · 0.8% slippage" },
  ];
}

export function swapResultFor(raw: string): SwapResult | undefined {
  const p = parseSwap(raw);
  if (!p || !p.amount) return undefined;
  const amt = parseFloat(p.amount);
  const perFrom = USD_PRICE[p.from] ?? 1;
  const totalUsd = amt * perFrom;
  const perTo = USD_PRICE[p.to] ?? 1;
  const into = totalUsd / perTo;
  return {
    out: `${qty(amt, 3)} ${p.from}`,
    into: `${qty(into, 4)} ${p.to}`,
    rate: `$${qty(perFrom, 2)}/${p.from}`,
  };
}

const plans: Record<Intents, (amountLabel?: string) => MarketPlan> = {
  "venus-protect": () => ({
    id: "VEN-001",
    intent: "Protect my Venus BNB loan if health factor drops below 1.3",
    agents: [
      {
        id: "venus-guard",
        handle: "@venus-liquidation-guard",
        protocol: "Venus Guard",
        role: "Protection",
        reputation: 97.4,
        jobsCompleted: 2140,
        fee: "$0.02/job",
        selected: true,
        why: "Top rep for position monitoring on Venus, 0.02% cheaper than the next quote",
      },
      {
        id: "aave-warden",
        handle: "@aave-health-warden",
        protocol: "Druid",
        role: "Protection",
        reputation: 91.8,
        jobsCompleted: 876,
        fee: "$0.06/job",
        selected: false,
        why: "Competing quote came in 0.04% higher at 91.8 rep",
      },
    ],
    actions: [
      {
        id: "a1",
        label: "Monitor health factor",
        agent: "@venus-liquidation-guard",
        protocol: "Venus",
        detail: "Poll borrowBalanceOf every block · trigger 1.30",
      },
      {
        id: "a2",
        label: "Repay from USDT balance",
        agent: "@venus-liquidation-guard",
        protocol: "Venus",
        detail: "Cover the borrow up to a $50 bound when guard fires",
      },
    ],
    cost: {
      quoted: "$0.14",
      gas: "$0.12",
      x402Fee: "$0.00",
      agentCommission: "$0.02",
    },
    permission: {
      maxSpend: "$50",
      expiry: "7 days",
      protocols: ["Venus"],
      scope: "repayBorrow · borrowBalanceOf",
    },
  }),
  "swap-bnb-usdt": (amountLabel = "5 BNB · 0.5% slippage") => ({
    id: "SWP-042",
    intent: `Swap ${amountLabel.split(" · ")[0]} for USDT`,
    agents: [
      {
        id: "pcs-router",
        handle: "@pancake-router-v3",
        protocol: "PancakeSwap",
        role: "Routing",
        reputation: 99.1,
        jobsCompleted: 14200,
        fee: "0.05%",
        selected: true,
        why: "Best locked route · 1.2% better than runner-up quote",
      },
      {
        id: "thena-keeper",
        handle: "@thena-liquidity-keeper",
        protocol: "Thena",
        role: "Routing",
        reputation: 93.2,
        jobsCompleted: 3400,
        fee: "0.08%",
        selected: false,
        why: "Competing route quoted 0.08% vs 0.05% selected",
      },
    ],
    actions: [
      {
        id: "a1",
        label: "Quote best route",
        agent: "@pancake-router-v3",
        protocol: "PancakeSwap",
        detail: "DEX pool scan · gas-aware routing",
      },
      {
        id: "a2",
        label: `Swap ${amountLabel.split(" · ")[0]}`,
        agent: "@pancake-router-v3",
        protocol: "PancakeSwap",
        detail: `Max slippage ${amountLabel.split(" · ")[1]?.replace(" slippage", "") ?? "0.5%"}`,
      },
    ],
    cost: {
      quoted: "$2.41",
      gas: "$0.21",
      x402Fee: "$0.35",
      agentCommission: "$1.85",
    },
    permission: {
      maxSpend: "$2,720",
      expiry: "1 hour",
      protocols: ["PancakeSwap"],
      scope: "swapExactIn · permit2-permit",
    },
  }),
  "cake-liquidity": () => ({
    id: "LIQ-117",
    intent: "Provide CAKE liquidity on PancakeSwap",
    agents: [
      {
        id: "liq-ops",
        handle: "@liquidity-ops",
        protocol: "PancakeSwap",
        role: "Liquidity",
        reputation: 96.8,
        jobsCompleted: 5410,
        fee: "0.10%",
        selected: true,
        why: "Most CAKE/BNB liquidity added in the last 30 days",
      },
      {
        id: "yield-compounder",
        handle: "@auto-compounder",
        protocol: "YieldNest",
        role: "Liquidity",
        reputation: 90.4,
        jobsCompleted: 1210,
        fee: "0.15%",
        selected: false,
        why: "After selected agent rejected quote · 0.15% vs 0.10%",
      },
    ],
    actions: [
      {
        id: "a1",
        label: "Convert 0.25 BNB to CAKE",
        agent: "@liquidity-ops",
        protocol: "PancakeSwap",
        detail: "Routed pair-funding split",
      },
      {
        id: "a2",
        label: "Add liquidity CAKE/BNB",
        agent: "@liquidity-ops",
        protocol: "PancakeSwap",
        detail: "Mint LP token · auto-compound window 30 days",
      },
    ],
    cost: {
      quoted: "$1.20",
      gas: "$0.34",
      x402Fee: "$0.20",
      agentCommission: "$0.66",
    },
    permission: {
      maxSpend: "$300",
      expiry: "24 hours",
      protocols: ["PancakeSwap", "YieldNest"],
      scope: "addLiquidity · mintLP",
    },
  }),
};

const traces: Record<Intents, TraceStep[]> = {
  "venus-protect": [
    { id: "hire", label: "Agent hired", detail: "@venus-liquidation-guard · $0.02 deposit" },
    { id: "key", label: "Session key granted", detail: "Altana scope repayBorrow · max $50 · 7 days" },
    { id: "watch", label: "Monitoring health factor", detail: "current 1.35 · trigger 1.30" },
    { id: "rails", label: "Alert rails armed", detail: "standing by · buffer -0.05 below trigger" },
  ],
  "swap-bnb-usdt": [
    { id: "hire", label: "Agent hired", detail: "@pancake-router-v3 · 0.05% fee" },
    { id: "key", label: "Session key granted", detail: "Altana scope swapExactIn · max $2,720 · 1 hour" },
    { id: "route", label: "Best route locked", detail: "1.2% better than runner-up quote" },
    { id: "tx", label: "Transaction submitted", detail: "waiting for confirmation" },
  ],
  "cake-liquidity": [
    { id: "hire", label: "Agent hired", detail: "@liquidity-ops · 0.10% fee" },
    { id: "key", label: "Session key granted", detail: "Altana scope addLiquidity · max $300 · 24 hours" },
    { id: "split", label: "Pair funding split", detail: "0.25 BNB routed to CAKE leg" },
    { id: "tx", label: "Transaction submitted", detail: "waiting for confirmation" },
  ],
};

export interface AgentEntry {
  handle: string;
  reputation: number;
  jobs: number;
}

export interface ProtocolEntry {
  id: string;
  name: string;
  category: string;
  agents: AgentEntry[];
}

export const CAPABILITIES: ProtocolEntry[] = [
  {
    id: "venus",
    name: "Venus",
    category: "Lending · Protection",
    agents: [
      { handle: "@venus-liquidation-guard", reputation: 97.4, jobs: 2140 },
      { handle: "@venus-supply-agent", reputation: 94.1, jobs: 980 },
    ],
  },
  {
    id: "pcs",
    name: "PancakeSwap",
    category: "Trading · Liquidity",
    agents: [
      { handle: "@pancake-router-v3", reputation: 99.1, jobs: 14200 },
      { handle: "@liquidity-ops", reputation: 96.8, jobs: 5410 },
    ],
  },
  {
    id: "aave",
    name: "Aave",
    category: "Lending",
    agents: [{ handle: "@aave-health-warden", reputation: 91.8, jobs: 876 }],
  },
  {
    id: "thena",
    name: "Thena",
    category: "Routing",
    agents: [{ handle: "@thena-liquidity-keeper", reputation: 93.2, jobs: 3400 }],
  },
  {
    id: "yield",
    name: "YieldNest",
    category: "Vaults",
    agents: [{ handle: "@auto-compounder", reputation: 90.4, jobs: 1210 }],
  },
];

export function resolveIntent(raw: string): ResolvedIntent {
  const t = raw.toLowerCase();
  if (t.includes("swap")) return { kind: "plan", intentKey: "swap-bnb-usdt", amountLabel: "5 BNB · 0.5% slippage" };
  if (t.includes("cak") || t.includes("liquid") || t.includes("provide"))
    return { kind: "plan", intentKey: "cake-liquidity", amountLabel: "" };
  return { kind: "plan", intentKey: "venus-protect", amountLabel: "" };
}

export function planFor(raw: string, amountLabel?: string): MarketPlan {
  const swap = parseSwap(raw);
  if (swap) return swapPlan(swap, amountLabel);
  const r = resolveIntent(raw);
  return plans[r.intentKey](amountLabel ?? r.amountLabel);
}

export function traceFor(raw: string): TraceStep[] {
  const swap = parseSwap(raw);
  if (swap) {
    const p = swapPlan(swap);
    return [
      { id: "hire", label: "Agent hired", detail: "@pancake-router-v3 · 0.05% fee" },
      { id: "key", label: "Session key granted", detail: `Altana scope swapExactIn · max ${p.permission.maxSpend} · 1 hour` },
      { id: "route", label: "Best route locked", detail: `1.2% better than runner-up quote for ${swap.from} → ${swap.to}` },
      { id: "tx", label: "Transaction submitted", detail: "waiting for confirmation" },
    ];
  }
  const { intentKey } = resolveIntent(raw);
  return traces[intentKey];
}

export function isMonitoringIntent(raw: string): boolean {
  return resolveIntent(raw).intentKey === "venus-protect";
}

export function shortLabelFor(raw: string): string {
  const swap = parseSwap(raw);
  if (swap) return `${swap.from} → ${swap.to} Swap`;
  switch (resolveIntent(raw).intentKey) {
    case "venus-protect":
      return "Venus Loan Guard";
    case "swap-bnb-usdt":
      return "BNB → USDT Swap";
    case "cake-liquidity":
      return "CAKE Liquidity";
  }
}

export function intentForSuggestion(raw: string): Intents {
  return resolveIntent(raw).intentKey;
}