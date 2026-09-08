import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';

import { PrivyAuthGuard } from '../auth/privy-auth.guard';
import { SkillRegistryService } from './skills/skill-registry.service';

/** Public competence catalog. Readable without a session — a skill cannot grant anything. */
@Controller('skills')
@UseGuards(PrivyAuthGuard)
export class SkillsController {
  constructor(private readonly skills: SkillRegistryService) {}

  @Get()
  list() {
    return this.skills.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    return {
      ...this.skills.summarize(id),
      taxonomyKeys: skill.taxonomyKeys,
      addressTable: skill.addressTable,
      callAddresses: skill.callAddresses,
    };
  }
}
