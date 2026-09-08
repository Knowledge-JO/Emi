import type { SkillRecord } from './skills/catalog';

/**
 * What an adapter may expose. A playbook is competence; a session is authority.
 * Adapters never construct a signer and never import WalletModule.
 */
export type AgentPlaybookView = {
  skillId: string | null;
  writeOnchain: boolean;
  callAddresses: string[];
  may: string[];
  mayNot: string[];
};

export function viewSkill(skill: SkillRecord): AgentPlaybookView {
  return {
    skillId: skill.id,
    writeOnchain: skill.writeOnchain,
    callAddresses: skill.callAddresses,
    may: skill.may,
    mayNot: skill.mayNot,
  };
}
