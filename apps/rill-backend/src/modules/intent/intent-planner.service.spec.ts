import type { LanguageModel } from '../ai/language-model';
import { FIRST_PARTY_TAXONOMY, planCapabilityGraph } from './capability-graph';
import { IntentPlannerService } from './intent-planner.service';
import { PROTECT_BNB_LOAN } from './protect-loan.fixture';
import { SWAP_FIVE_USDT } from './swap-five-usdt.fixture';

describe('IntentPlannerService', () => {
  it('does not call the model for a single swap', async () => {
    const generateJson = jest.fn();
    const planner = new IntentPlannerService({
      provider: 'gemini',
      generateJson,
    } as unknown as LanguageModel);

    const planned = await planner.plan(SWAP_FIVE_USDT, FIRST_PARTY_TAXONOMY);

    expect(generateJson).not.toHaveBeenCalled();
    expect(planned.source).toBe('deterministic');
    expect(planned.graph).toEqual(planCapabilityGraph(SWAP_FIVE_USDT));
  });

  it('accepts a schema-valid protect DAG from the model', async () => {
    const graph = planCapabilityGraph(PROTECT_BNB_LOAN);
    const planner = new IntentPlannerService({
      provider: 'gemini',
      generateJson: async () => ({
        json: { nodes: graph, assumptions: ['HF threshold 1.3'] },
        model: 'gemini-2.5-flash',
        promptTokens: 1,
        completionTokens: 1,
        latencyMs: 1,
      }),
    } as unknown as LanguageModel);

    const planned = await planner.plan(PROTECT_BNB_LOAN, FIRST_PARTY_TAXONOMY);

    expect(planned.source).toBe('llm');
    expect(planned.assumptions).toEqual(['HF threshold 1.3']);
    expect(planned.graph.map((node) => node.id)).toEqual([
      'monitor',
      'risk',
      'swap',
      'repay',
    ]);
  });

  it('falls back when the model invents an unknown taxonomy', async () => {
    const planner = new IntentPlannerService({
      provider: 'gemini',
      generateJson: async () => ({
        json: {
          nodes: [
            {
              id: 'weird',
              goalId: 'weird',
              taxonomyKey: 'made.up',
              dependsOn: [],
            },
          ],
          assumptions: [],
        },
        model: 'gemini-2.5-flash',
        promptTokens: 1,
        completionTokens: 1,
        latencyMs: 1,
      }),
    } as unknown as LanguageModel);

    const planned = await planner.plan(PROTECT_BNB_LOAN, FIRST_PARTY_TAXONOMY);

    expect(planned.source).toBe('deterministic');
    expect(planned.assumptions).toEqual(['planner_llm_failed']);
    expect(planned.graph).toEqual(planCapabilityGraph(PROTECT_BNB_LOAN));
  });
});
