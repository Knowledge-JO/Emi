import { SWAP_FIVE_USDT } from './swap-five-usdt.fixture';
import { PROTECT_BNB_LOAN } from './protect-loan.fixture';
import {
  assertAcyclic,
  buildCapabilityGraph,
  planCapabilityGraph,
} from './capability-graph';

describe('buildCapabilityGraph', () => {
  it('maps a swap leg onto a defi.swap node without picking an agent', () => {
    const graph = buildCapabilityGraph(SWAP_FIVE_USDT);

    expect(graph).toEqual([
      {
        id: 'leg-0',
        goalId: 'execute',
        taxonomyKey: 'defi.swap',
        dependsOn: [],
        input: {
          fromSymbol: 'USDT',
          toSymbol: 'BNB',
          amount: '5',
          chain: 'bnb',
        },
      },
    ]);
  });

  it('chains dependsOn across multiple legs', () => {
    const graph = buildCapabilityGraph({
      ...SWAP_FIVE_USDT,
      kind: 'protect',
      legs: [
        {
          type: 'monitor',
          taxonomyKey: 'defi.lending.protect',
          from: { symbol: 'BNB', amount: null },
          to: { symbol: 'BNB', amount: null },
        },
        {
          type: 'swap',
          taxonomyKey: 'defi.swap',
          from: { symbol: 'USDT', amount: '5' },
          to: { symbol: 'BNB', amount: null },
        },
        {
          type: 'repay',
          taxonomyKey: 'defi.lending.repay',
          from: { symbol: 'BNB', amount: null },
          to: { symbol: 'BNB', amount: null },
        },
      ],
    });

    expect(graph.map((node) => node.dependsOn)).toEqual([
      [],
      ['leg-0'],
      ['leg-1'],
    ]);
    expect(graph.map((node) => node.taxonomyKey)).toEqual([
      'defi.lending.protect',
      'defi.swap',
      'defi.lending.repay',
    ]);
  });
});

describe('planCapabilityGraph', () => {
  it('keeps a swap as a single unbound node', () => {
    expect(planCapabilityGraph(SWAP_FIVE_USDT)).toEqual(
      buildCapabilityGraph(SWAP_FIVE_USDT),
    );
  });

  it('expands loan protection into a DAG mapped onto catalog keys', () => {
    const graph = planCapabilityGraph(PROTECT_BNB_LOAN);

    expect(graph.map((node) => [node.id, node.taxonomyKey, node.dependsOn])).toEqual([
      ['monitor', 'research.screen', []],
      ['risk', 'risk.health_factor', ['monitor']],
      ['swap', 'defi.swap', ['risk']],
      ['repay', 'defi.lending.supply', ['swap', 'risk']],
    ]);
    expect(() => assertAcyclic(graph)).not.toThrow();
  });

  it('rejects a cyclic graph', () => {
    expect(() =>
      assertAcyclic([
        {
          id: 'a',
          goalId: 'a',
          taxonomyKey: 'defi.swap',
          dependsOn: ['b'],
        },
        {
          id: 'b',
          goalId: 'b',
          taxonomyKey: 'risk.health_factor',
          dependsOn: ['a'],
        },
      ]),
    ).toThrow(/cycle/);
  });
});
