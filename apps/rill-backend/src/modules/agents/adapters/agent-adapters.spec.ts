import { CopyTradeAgentAdapter } from './copy-trade.adapter';
import { LoanAgentAdapter } from './loan-agent.adapter';
import { ResearchAgentAdapter } from './research-agent.adapter';
import { RiskAgentAdapter } from './risk-agent.adapter';
import { SwapAgentAdapter } from './swap-agent.adapter';
import { TokenAgentAdapter } from './token-agent.adapter';
import { SkillRegistryService } from '../skills/skill-registry.service';

describe('agent adapters', () => {
  const skills = new SkillRegistryService();

  it('loads playbooks without a signer or wallet handle', () => {
    const research = new ResearchAgentAdapter(skills).playbook();
    expect(research.writeOnchain).toBe(false);
    expect(research.callAddresses).toEqual([]);
    expect(research).not.toHaveProperty('signer');
    expect(research).not.toHaveProperty('session');

    const loan = new LoanAgentAdapter(skills).playbook();
    expect(loan.mayNot.some((item) => /borrow/i.test(item))).toBe(true);

    const risk = new RiskAgentAdapter().playbook();
    expect(risk.writeOnchain).toBe(false);
    expect(risk.skillId).toBeNull();

    expect(new SwapAgentAdapter(skills).playbook().skillId).toBe(
      'pancakeswap-trading',
    );
    expect(new TokenAgentAdapter(skills).playbook().skillId).toBe('four-meme');
  });

  it('refuses a copy-trade playbook with a malformed leader wallet', () => {
    const copy = new CopyTradeAgentAdapter(skills);
    expect(copy.playbook().skillId).toBe('copy-trade');
    expect(() => copy.playbook('not-an-address')).toThrow(/leader wallet/);
  });
});
