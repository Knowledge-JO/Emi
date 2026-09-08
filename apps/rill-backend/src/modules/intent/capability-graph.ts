import type {
  CapabilityGraphNode,
  GoalNode,
  ParsedIntent,
} from '../../database/schema/intents';
import { FIRST_PARTY_TAXONOMY } from '../marketplace/taxonomy';

export { FIRST_PARTY_TAXONOMY };

const TAXONOMY_ALIASES: Record<string, string> = {
  'defi.swap': 'defi.swap',
  'research.screen': 'research.screen',
  'risk.health_factor': 'risk.health_factor',
  'risk.position_health': 'risk.health_factor',
  'defi.lending.supply': 'defi.lending.supply',
  'defi.lending.repay': 'defi.lending.supply',
  'defi.lending.protect': 'research.screen',
  'defi.copy_trade': 'defi.copy_trade',
  'defi.launchpad.swap': 'defi.launchpad.swap',
};

/**
 * One-to-one mapping from parsed legs. Quote/execute children on the goal tree are colour;
 * they do not invent capabilities. Linear `dependsOn` is the fallback when the intent is not
 * a protection tree.
 */
export function buildCapabilityGraph(
  intent: ParsedIntent,
): CapabilityGraphNode[] {
  return intent.legs.map((leg, index) => ({
    id: `leg-${index}`,
    goalId: goalIdForLeg(intent, index),
    taxonomyKey: leg.taxonomyKey,
    dependsOn: index === 0 ? [] : [`leg-${index - 1}`],
    input: {
      fromSymbol: leg.from.symbol,
      toSymbol: leg.to.symbol,
      amount: leg.from.amount,
      chain: intent.chain,
    },
  }));
}

/**
 * Schema-validated plan the marketplace can resolve. A swap stays one node. A protect intent
 * becomes a DAG: monitor → risk → swap → repay, with repay depending on both risk and swap.
 */
export function planCapabilityGraph(
  intent: ParsedIntent,
  available: readonly string[] = FIRST_PARTY_TAXONOMY,
): CapabilityGraphNode[] {
  if (intent.kind === 'protect') {
    return protectDag(intent, available);
  }
  return buildCapabilityGraph(intent);
}

export function mapTaxonomyKey(
  requested: string,
  available: readonly string[],
): string {
  const mapped = TAXONOMY_ALIASES[requested] ?? requested;
  if (available.length === 0 || available.includes(mapped)) {
    return mapped;
  }
  return mapped;
}

export function assertAcyclic(nodes: CapabilityGraphNode[]): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const walk = (id: string) => {
    if (visited.has(id) || visiting.has(id)) {
      if (visiting.has(id)) {
        throw new Error(`Capability graph cycle at '${id}'`);
      }
      return;
    }
    visiting.add(id);
    for (const parent of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(parent)) {
        throw new Error(`dependsOn '${parent}' is not a graph node`);
      }
      walk(parent);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const node of nodes) {
    walk(node.id);
  }
}

function protectDag(
  intent: ParsedIntent,
  available: readonly string[],
): CapabilityGraphNode[] {
  const chain = intent.chain === 'unspecified' ? 'bnb' : intent.chain;
  const collateral = firstSymbol(intent, 'from') ?? 'BNB';
  const repayment = firstSymbol(intent, 'to') ?? 'USDT';
  const amount =
    intent.legs.find((leg) => leg.from.amount)?.from.amount ?? null;

  const nodes: CapabilityGraphNode[] = [
    {
      id: 'monitor',
      goalId: goalIdMatching(intent.goalTree, /monitor/i, 'monitor'),
      taxonomyKey: 'research.screen',
      dependsOn: [],
      input: { fromSymbol: collateral, toSymbol: collateral, amount, chain },
    },
    {
      id: 'risk',
      goalId: goalIdMatching(intent.goalTree, /risk|health/i, 'risk'),
      taxonomyKey: 'risk.health_factor',
      dependsOn: ['monitor'],
      input: {
        fromSymbol: collateral,
        toSymbol: collateral,
        amount,
        chain,
        subject: collateral,
      },
    },
    {
      id: 'swap',
      goalId: goalIdMatching(intent.goalTree, /swap|repayment|obtain/i, 'swap'),
      taxonomyKey: 'defi.swap',
      dependsOn: ['risk'],
      input: {
        fromSymbol: collateral === repayment ? 'BNB' : collateral,
        toSymbol: repayment === collateral ? 'USDT' : repayment,
        amount,
        chain,
      },
    },
    {
      id: 'repay',
      goalId: goalIdMatching(intent.goalTree, /repay|withdraw|supply/i, 'repay'),
      taxonomyKey: 'defi.lending.supply',
      dependsOn: ['swap', 'risk'],
      input: {
        fromSymbol: repayment === collateral ? 'USDT' : repayment,
        toSymbol: collateral,
        amount,
        chain,
        action: 'withdraw',
      },
    },
  ];

  return filterAvailable(nodes, available);
}

function filterAvailable(
  nodes: CapabilityGraphNode[],
  available: readonly string[],
): CapabilityGraphNode[] {
  if (available.length === 0) {
    return nodes;
  }
  const kept = nodes.filter((node) => available.includes(node.taxonomyKey));
  const ids = new Set(kept.map((node) => node.id));
  return kept.map((node) => ({
    ...node,
    dependsOn: node.dependsOn.filter((id) => ids.has(id)),
  }));
}

function goalIdForLeg(intent: ParsedIntent, index: number): string {
  const children = intent.goalTree.children ?? [];
  if (children.length === intent.legs.length) {
    return children[index]?.id ?? intent.goalTree.id;
  }
  if (intent.legs.length === 1 && children.length > 0) {
    const execute = children.find((child) =>
      /execute|swap|repay|borrow|lend/i.test(child.goal),
    );
    return (execute ?? children[children.length - 1]).id;
  }
  return children[index]?.id ?? intent.goalTree.id;
}

function goalIdMatching(
  tree: GoalNode,
  pattern: RegExp,
  fallback: string,
): string {
  const stack = [tree, ...(tree.children ?? [])];
  for (const node of stack) {
    if (node.id === fallback || pattern.test(node.goal) || pattern.test(node.id)) {
      return node.id;
    }
    for (const child of node.children ?? []) {
      if (pattern.test(child.goal) || pattern.test(child.id)) {
        return child.id;
      }
    }
  }
  return fallback;
}

function firstSymbol(
  intent: ParsedIntent,
  side: 'from' | 'to',
): string | null {
  for (const leg of intent.legs) {
    const symbol = leg[side].symbol;
    if (symbol) return symbol;
  }
  return null;
}
