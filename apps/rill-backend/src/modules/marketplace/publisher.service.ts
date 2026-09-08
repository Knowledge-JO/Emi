import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { AgentIdentityService } from '../identity/agent-identity.service';
import { AgentRegistryService } from './agent-registry.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { DeveloperRegistryService } from './developer-registry.service';
import type { AttachListingIdentityDto } from './dto/attach-listing-identity.dto';
import type { BecomePublisherDto } from './dto/become-publisher.dto';
import type { DeclareListingCapabilityDto } from './dto/declare-listing-capability.dto';
import type { RegisterListingDto } from './dto/register-listing.dto';

/**
 * Third-party self-serve registry. Same services seed uses; ownership is the signed-in user.
 * Publish still requires an identity cache and an active capability.
 */
@Injectable()
export class PublisherService {
  constructor(
    private readonly developers: DeveloperRegistryService,
    private readonly agents: AgentRegistryService,
    private readonly capabilities: CapabilityRegistryService,
    private readonly identity: AgentIdentityService,
    @Inject(ConfigService) private readonly config: RillConfigService,
  ) {}

  become(userId: string, input: BecomePublisherDto) {
    return this.developers.becomePublisher(userId, input);
  }

  me(userId: string) {
    return this.developers.getByUserId(userId);
  }

  async register(userId: string, input: RegisterListingDto) {
    const publisher = await this.requirePublisher(userId);
    return this.agents.register({
      developerId: publisher.id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      acceptsErc8183: input.acceptsErc8183,
      acceptsX402: input.acceptsX402,
      canSubcontract: input.canSubcontract,
      skillId: input.skillId,
    });
  }

  async attachIdentity(
    userId: string,
    slug: string,
    input: AttachListingIdentityDto,
  ) {
    const { agent } = await this.requireOwned(userId, slug);
    return this.identity.attachCache({
      agentId: agent.id,
      chainId: this.config.get('altana.chainId', { infer: true }),
      registryAddress: this.config.get('erc8004.registryAddress', {
        infer: true,
      }),
      onchainAgentId: input.onchainAgentId,
      agentDomain: input.agentDomain,
      endpointUrl: input.endpointUrl,
    });
  }

  async declareCapability(
    userId: string,
    slug: string,
    input: DeclareListingCapabilityDto,
  ) {
    const { agent } = await this.requireOwned(userId, slug);
    return this.capabilities.declare({
      agentId: agent.id,
      name: input.name,
      taxonomyKey: input.taxonomyKey,
      description: input.description,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      pricingModel: input.pricingModel,
      settlementRail: input.settlementRail,
      unitPrice: input.unitPrice,
      priceAssetId: input.priceAssetId,
      assetIds: input.assetIds,
      protocolIds: input.protocolIds,
      expectedDurationSeconds: input.expectedDurationSeconds,
      x402ResourceUrl: input.x402ResourceUrl,
      x402Method: input.x402Method,
    });
  }

  async publish(userId: string, slug: string) {
    const { agent } = await this.requireOwned(userId, slug);
    return this.agents.publish(agent.id);
  }

  private async requirePublisher(userId: string) {
    const publisher = await this.developers.getByUserId(userId);
    if (!publisher) {
      throw new ForbiddenException('Become a publisher before listing an agent');
    }
    return publisher;
  }

  private async requireOwned(userId: string, slug: string) {
    const publisher = await this.requirePublisher(userId);
    const agent = await this.agents.getBySlug(slug);
    if (!agent || agent.developerId !== publisher.id) {
      throw new NotFoundException('Listing not found');
    }
    return { publisher, agent };
  }
}
