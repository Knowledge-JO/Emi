import { Injectable } from '@nestjs/common';

import { viewSkill, type AgentPlaybookView } from '../agent.interface';
import { SkillRegistryService } from '../skills/skill-registry.service';

/**
 * Copy-trade: PancakeSwap execution plus Token Radar screening.
 * The leader wallet is a user input — never a default in this adapter.
 */
@Injectable()
export class CopyTradeAgentAdapter {
  constructor(private readonly skills: SkillRegistryService) {}

  playbook(leaderWallet?: string): AgentPlaybookView {
    if (leaderWallet !== undefined && !/^0x[0-9a-fA-F]{40}$/.test(leaderWallet)) {
      throw new Error('Copy-trade needs a 20-byte leader wallet from the user');
    }
    return viewSkill(this.skills.require('copy-trade'));
  }
}
