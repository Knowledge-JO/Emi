import { Injectable } from '@nestjs/common';

import {
  SKILLS,
  toSkillSummary,
  type SkillRecord,
  type SkillSummary,
} from './catalog';

const SKILLS_INDEX_URL =
  'https://raw.githubusercontent.com/altananetwork/skills/main/index.json';

/**
 * Protocol know-how for running agents. A skill cannot grant anything; it only describes how a
 * protocol works. Session scope is derived from `callAddresses`, never from the playbook text.
 */
@Injectable()
export class SkillRegistryService {
  list(): SkillSummary[] {
    return SKILLS.map(toSkillSummary);
  }

  get(id: string): SkillRecord | undefined {
    return SKILLS.find((skill) => skill.id === id);
  }

  require(id: string): SkillRecord {
    const skill = this.get(id);
    if (!skill) {
      throw new Error(`Unknown skill '${id}'`);
    }
    return skill;
  }

  forTaxonomy(taxonomyKey: string): SkillRecord | undefined {
    return SKILLS.find((skill) => skill.taxonomyKeys.includes(taxonomyKey));
  }

  summarize(id: string): SkillSummary | undefined {
    const skill = this.get(id);
    return skill ? toSkillSummary(skill) : undefined;
  }

  /**
   * Re-read the public registry at execute time. Addresses still come from the catalog —
   * a skill page that drifted (the corrupted USDT snapshot) must not widen or replace them.
   * GitHub being unreachable does not block a swap; the local record is enough.
   */
  async confirmUpstream(id: string): Promise<{ found: boolean } | null> {
    try {
      const response = await fetch(SKILLS_INDEX_URL, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        skills?: Array<{ id?: string }>;
      };
      const found = (body.skills ?? []).some((skill) => skill.id === id);
      return { found };
    } catch {
      return null;
    }
  }
}
