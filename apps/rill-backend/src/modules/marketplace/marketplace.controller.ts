import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';

import { PrivyAuthGuard } from '../auth/privy-auth.guard';
import { AgentRegistryService } from './agent-registry.service';

type PublicCapability = {
  id: string;
  name: string;
  taxonomyKey: string;
  description: string;
  pricingModel: string;
  settlementRail: string;
  unitPrice: string;
  expectedDurationSeconds: number | null;
};

type PublicAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: { slug: string; displayName: string };
  capabilities: PublicCapability[];
};

/**
 * Browse active listings. Discovery for a specific intent happens on `POST /intents`, not here —
 * this is the catalog a human (or another agent) can read without submitting a goal.
 */
@Controller('marketplace')
@UseGuards(PrivyAuthGuard)
export class MarketplaceController {
  constructor(private readonly registry: AgentRegistryService) {}

  @Get('agents')
  async list(): Promise<PublicAgent[]> {
    const rows = await this.registry.listActive();
    return rows.map(toPublic);
  }

  @Get('agents/:slug')
  async get(@Param('slug') slug: string): Promise<PublicAgent> {
    const row = await this.registry.getActiveBySlug(slug);
    if (!row) {
      throw new NotFoundException('Agent not found');
    }
    return toPublic(row);
  }
}

function toPublic(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: { slug: string; displayName: string };
  capabilities: Array<{
    id: string;
    name: string;
    taxonomyKey: string;
    description: string;
    pricingModel: string;
    settlementRail: string;
    unitPrice: string;
    expectedDurationSeconds: number | null;
    status: string;
  }>;
}): PublicAgent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    version: row.version,
    developer: {
      slug: row.developer.slug,
      displayName: row.developer.displayName,
    },
    capabilities: row.capabilities
      .filter((cap) => cap.status === 'active')
      .map((cap) => ({
        id: cap.id,
        name: cap.name,
        taxonomyKey: cap.taxonomyKey,
        description: cap.description,
        pricingModel: cap.pricingModel,
        settlementRail: cap.settlementRail,
        unitPrice: cap.unitPrice,
        expectedDurationSeconds: cap.expectedDurationSeconds,
      })),
  };
}
