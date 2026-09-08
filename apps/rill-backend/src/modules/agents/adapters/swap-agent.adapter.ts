import { Injectable } from '@nestjs/common';

import { viewSkill, type AgentPlaybookView } from '../agent.interface';
import { SkillRegistryService } from '../skills/skill-registry.service';

/**
 * SwapMaster competence is `pancakeswap-trading`. Execute loads that playbook elsewhere.
 * This adapter never constructs a signer.
 */
@Injectable()
export class SwapAgentAdapter {
  constructor(private readonly skills: SkillRegistryService) {}

  playbook(): AgentPlaybookView {
    return viewSkill(this.skills.require('pancakeswap-trading'));
  }
}
