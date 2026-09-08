import { Injectable } from '@nestjs/common';

import { viewSkill, type AgentPlaybookView } from '../agent.interface';
import { SkillRegistryService } from '../skills/skill-registry.service';

/**
 * Aave V3 supply/withdraw. The skill must not borrow. Loan Guardian composes Risk (x402)
 * and SwapMaster (ERC-8183); this adapter only describes the Aave playbook. It never
 * constructs a signer.
 */
@Injectable()
export class LoanAgentAdapter {
  constructor(private readonly skills: SkillRegistryService) {}

  playbook(): AgentPlaybookView {
    const skill = this.skills.require('aave-v3-lending');
    if (!skill.mayNot.some((item) => /borrow/i.test(item))) {
      throw new Error('aave-v3-lending must refuse borrow');
    }
    return viewSkill(skill);
  }
}
