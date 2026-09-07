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
  const r = resolveIntent(raw);
  return plans[r.intentKey](amountLabel ?? r.amountLabel);
}

export function traceFor(raw: string): TraceStep[] {
  const { intentKey } = resolveIntent(raw);
  return traces[intentKey];
}

export function isMonitoringIntent(raw: string): boolean {
  return resolveIntent(raw).intentKey === "venus-protect";
}

export function shortLabelFor(raw: string): string {
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