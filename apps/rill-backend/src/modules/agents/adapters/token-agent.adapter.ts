import { Injectable } from '@nestjs/common';

import { viewSkill, type AgentPlaybookView } from '../agent.interface';
import { SkillRegistryService } from '../skills/skill-registry.service';

/**
 * Four.meme curves. Token-factory deploy is not seeded; this playbook only trades the curve.
 * Never constructs a signer.
 */
@Injectable()
export class TokenAgentAdapter {
  constructor(private readonly skills: SkillRegistryService) {}

  playbook(): AgentPlaybookView {
    return viewSkill(this.skills.require('four-meme'));
  }
}
