import { Injectable } from '@nestjs/common';

import { viewSkill, type AgentPlaybookView } from '../agent.interface';
import { SkillRegistryService } from '../skills/skill-registry.service';

/**
 * Token Radar. Read-only: pair with a zero-scope session (no calls, no spend).
 * This adapter never constructs a signer.
 */
@Injectable()
export class ResearchAgentAdapter {
  constructor(private readonly skills: SkillRegistryService) {}

  playbook(): AgentPlaybookView {
    const skill = this.skills.require('dexscreener-token-radar');
    if (skill.writeOnchain || skill.callAddresses.length > 0) {
      throw new Error('Token Radar must stay zero-scope');
    }
    return viewSkill(skill);
  }
}
