import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { agents, reputation } from '../../database/schema';
import { AgentIdentityService } from './agent-identity.service';
import { listingMatchesOnchain } from './erc8004-codec';
import type { Erc8004RegistrationFile } from './erc8004-codec';
import { Erc8004RegistryService } from './erc8004-registry.service';

export type IdentityCard = {
  slug: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: {
    slug: string;
    displayName: string;
    verification: string;
  };
  capabilities: Array<{
    id: string;
    name: string;
    taxonomyKey: string;
    description: string;
    pricingModel: string;
    settlementRail: string;
    unitPrice: string;
    expectedDurationSeconds: number | null;
  }>;
  identity: {
    chainId: number;
    registryAddress: string;
    onchainAgentId: string;
    ownerAddress: string | null;
    agentDomain: string | null;
    endpointUrl: string | null;
    lastSyncBlock: number;
    lastSyncedAt: string | null;
    synced: boolean;
  };
  reputation: { score01: number };
  live?: {
    owner: string;
    uri: string;
    block: number;
    listingMatchesOnchain: boolean;
    onchainName: string | null;
  };
  liveError?: { code: 'identity_not_on_chain' };
};

type LoadedListing = NonNullable<
  Awaited<ReturnType<IdentityCardService['loadListing']>>
>;
type Listing = LoadedListing & { identity: NonNullable<LoadedListing['identity']> };

/**
 * The public identity card a counterparty reads before hiring. Listing fields come from the
 * marketplace tables; the ERC-8004 row is a cache. `?live=1` re-reads the registry without
 * writing. POST sync writes the cache. Reputation is the derived 0–1 score (missing = 0.5).
 */
@Injectable()
export class IdentityCardService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly identities: AgentIdentityService,
    private readonly registry: Erc8004RegistryService,
  ) {}

  async getBySlug(slug: string, live: boolean): Promise<IdentityCard> {
    const listing = await this.requireListing(slug);
    const card = await this.toCard(listing);

    if (!live) {
      return card;
    }

    const read = await this.registry.readOrNull(listing.identity.onchainAgentId);
    if (!read) {
      return { ...card, liveError: { code: 'identity_not_on_chain' } };
    }

    return {
      ...card,
      live: {
        owner: read.owner,
        uri: read.uri,
        block: read.block,
        listingMatchesOnchain: listingMatchesOnchain(listing.name, read.decoded),
        onchainName:
          read.decoded.kind === 'record' ? (read.decoded.record.name ?? null) : null,
      },
    };
  }

  async syncBySlug(slug: string) {
    const listing = await this.requireListing(slug);
    const live = await this.registry.read(listing.identity.onchainAgentId);
    const { row, listingMatchesOnchain: matches } =
      await this.identities.applyLiveRead({
        agentId: listing.id,
        listingName: listing.name,
        live,
        registryAddress: this.registry.registryAddress(),
        chainId: this.registry.chainId(),
      });

    const card = await this.getBySlug(slug, false);
    return {
      ...card,
      identity: {
        ...card.identity,
        ownerAddress: row.ownerAddress,
        agentDomain: row.agentDomain,
        endpointUrl: row.endpointUrl,
        lastSyncBlock: row.lastSyncBlock ?? 0,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        synced: (row.lastSyncBlock ?? 0) > 0,
      },
      live: {
        owner: live.owner,
        uri: live.uri,
        block: live.block,
        listingMatchesOnchain: matches,
        onchainName:
          live.decoded.kind === 'record' ? (live.decoded.record.name ?? null) : null,
      },
    };
  }

  registrationCalls(slug: string) {
    return this.requireListing(slug).then((listing) => {
      const record = recordFromListing(listing);
      return {
        warning:
          'Scope a session to these two selectors. A grant of { to: registry } also allows transferFrom and setApprovalForAll.',
        register: this.registry.buildRegisterCall(record),
        setAgentUri: this.registry.buildSetAgentUriCall(
          listing.identity.onchainAgentId,
          record,
        ),
      };
    });
  }

  async assertDeveloperOwns(slug: string, userId: string): Promise<Listing> {
    const listing = await this.requireListing(slug);
    if (listing.developer.userId !== userId) {
      throw new ForbiddenException({
        message: 'Only the listing developer can issue an agent API key',
        code: 'identity_key_not_developer',
      });
    }
    return listing;
  }

  async cardForAgentId(agentId: string): Promise<IdentityCard> {
    const listing = await this.db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: {
        developer: true,
        identity: true,
        capabilities: true,
      },
    });

    if (!listing || listing.status !== 'active' || !listing.identity) {
      throw new NotFoundException('Agent identity not found');
    }

    return this.toCard(listing as Listing);
  }

  private async requireListing(slug: string): Promise<Listing> {
    const listing = await this.loadListing(slug);
    if (!listing || listing.status !== 'active') {
      throw new NotFoundException('Agent not found');
    }
    if (!listing.identity) {
      throw new UnprocessableEntityException({
        message: 'Listing has no ERC-8004 identity cache',
        code: 'identity_not_attached',
      });
    }
    return listing as Listing;
  }

  private loadListing(slug: string) {
    return this.db.query.agents.findFirst({
      where: eq(agents.slug, slug),
      with: {
        developer: true,
        identity: true,
        capabilities: true,
      },
    });
  }

  private async toCard(listing: Listing): Promise<IdentityCard> {
    const score = await this.score01(listing.id);
    const identity = listing.identity;

    return {
      slug: listing.slug,
      name: listing.name,
      description: listing.description,
      category: listing.category,
      version: listing.version,
      developer: {
        slug: listing.developer.slug,
        displayName: listing.developer.displayName,
        verification: listing.developer.verification,
      },
      capabilities: listing.capabilities
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
      identity: {
        chainId: identity.chainId,
        registryAddress: identity.registryAddress,
        onchainAgentId: identity.onchainAgentId,
        ownerAddress: identity.ownerAddress,
        agentDomain: identity.agentDomain,
        endpointUrl: identity.endpointUrl,
        lastSyncBlock: identity.lastSyncBlock ?? 0,
        lastSyncedAt: identity.lastSyncedAt
          ? identity.lastSyncedAt.toISOString()
          : null,
        synced: (identity.lastSyncBlock ?? 0) > 0,
      },
      reputation: { score01: score },
    };
  }

  private async score01(agentId: string): Promise<number> {
    const row = await this.db.query.reputation.findFirst({
      where: and(eq(reputation.agentId, agentId), eq(reputation.window, 'lifetime')),
    });

    if (row?.score == null) {
      return 0.5;
    }

    return Math.min(1, Math.max(0, row.score / 100));
  }
}

function recordFromListing(listing: Listing): Erc8004RegistrationFile {
  const endpoint =
    listing.identity.endpointUrl ??
    (listing.identity.agentDomain
      ? `https://${listing.identity.agentDomain}`
      : `https://${listing.slug}.rill.local`);

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: listing.name,
    description: listing.description,
    services: [{ name: 'rill', endpoint }],
  };
}
