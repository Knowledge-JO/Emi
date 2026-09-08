import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { AgentAvailabilityService } from './agent-availability.service';
import { AgentDiscoveryService } from './agent-discovery.service';
import { AgentPricingService } from './agent-pricing.service';
import { AgentRankingService } from './agent-ranking.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentReputationService } from './agent-reputation.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { CatalogService } from './catalog.service';
import { DeveloperRegistryService } from './developer-registry.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceMatchingService } from './marketplace-matching.service';
import { PublisherController } from './publisher.controller';
import { PublisherService } from './publisher.service';

/**
 * Marketplace Engine — registry, discovery, capabilities, pricing, ranking, reputation and
 * availability. Serves both commerce directions once they exist: users hiring agents, and
 * agents hiring agents.
 *
 * Intent imports this module. This module does not import Intent, so the planner can ask for
 * matches without a cycle.
 */
@Module({
  imports: [IdentityModule],
  controllers: [MarketplaceController, PublisherController],
  providers: [
    CatalogService,
    DeveloperRegistryService,
    CapabilityRegistryService,
    AgentRegistryService,
    AgentDiscoveryService,
    AgentRankingService,
    AgentAvailabilityService,
    AgentPricingService,
    AgentReputationService,
    MarketplaceMatchingService,
    PublisherService,
  ],
  exports: [
    MarketplaceMatchingService,
    AgentRegistryService,
    CapabilityRegistryService,
    DeveloperRegistryService,
    CatalogService,
  ],
})
export class MarketplaceModule {}
