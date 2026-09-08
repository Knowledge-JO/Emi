import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { agents } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import { AgentIdentityService } from '../identity/agent-identity.service';
import { CapabilityRegistryService } from './capability-registry.service';

export type RegisterAgentInput = {
  developerId: string;
  slug: string;
  name: string;
  description: string;
  category?: (typeof agents.$inferInsert)['category'];
  version?: string;
  acceptsErc8183?: boolean;
  acceptsX402?: boolean;
  canSubcontract?: boolean;
  skillId?: string;
};

/**
 * Step 2b: listing lifecycle. An agent starts as `draft`. Publish to `active` is refused unless
 * an ERC-8004 identity is attached and at least one capability is declared — the two invariants
 * that make a listing matchable rather than a blob of marketing text.
 */
@Injectable()
export class AgentRegistryService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly identity: AgentIdentityService,
    private readonly capabilities: CapabilityRegistryService,
    private readonly events: EventStoreService,
  ) {}

  getById(id: string) {
    return this.db.query.agents.findFirst({ where: eq(agents.id, id) });
  }

  getBySlug(slug: string) {
    return this.db.query.agents.findFirst({ where: eq(agents.slug, slug) });
  }

  listActive() {
    return this.db.query.agents.findMany({
      where: eq(agents.status, 'active'),
      with: {
        developer: true,
        identity: true,
        capabilities: true,
      },
    });
  }

  async getActiveBySlug(slug: string) {
    const agent = await this.db.query.agents.findFirst({
      where: eq(agents.slug, slug),
      with: {
        developer: true,
        identity: true,
        capabilities: true,
      },
    });

    if (!agent || agent.status !== 'active') {
      return null;
    }

    return agent;
  }

  async register(input: RegisterAgentInput) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      throw new BadRequestException('Agent slug must be lowercase kebab-case');
    }

    const [row] = await this.db
      .insert(agents)
      .values({
        developerId: input.developerId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        category: input.category ?? 'other',
        version: input.version ?? '0.1.0',
        status: 'draft',
        acceptsErc8183: input.acceptsErc8183 ?? false,
        acceptsX402: input.acceptsX402 ?? false,
        canSubcontract: input.canSubcontract ?? false,
        metadata: input.skillId ? { skillId: input.skillId } : {},
      })
      .returning();

    await this.events.append({
      type: 'agent.registered',
      subjectType: 'agent',
      subjectId: row.id,
      actorKind: 'platform',
      actorId: input.developerId,
      payload: { slug: row.slug, status: row.status },
    });

    return row;
  }

  async publish(agentId: string) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    if (agent.status === 'active') {
      return agent;
    }
    if (agent.status !== 'draft' && agent.status !== 'pending_review') {
      throw new BadRequestException(
        `Cannot publish an agent in status '${agent.status}'`,
      );
    }

    const identity = await this.identity.getByAgentId(agentId);
    if (!identity) {
      throw new BadRequestException(
        'A listing needs an ERC-8004 identity before it can be published',
      );
    }

    const declared = await this.capabilities.listByAgent(agentId);
    const activeCaps = declared.filter((cap) => cap.status === 'active');
    if (activeCaps.length === 0) {
      throw new BadRequestException(
        'A listing needs at least one active capability before it can be published',
      );
    }

    await this.capabilities.embedMissingForAgent(agentId);

    const [published] = await this.db
      .update(agents)
      .set({ status: 'active' })
      .where(eq(agents.id, agentId))
      .returning();

    await this.events.append({
      type: 'agent.published',
      subjectType: 'agent',
      subjectId: agentId,
      actorKind: 'platform',
      actorId: agent.developerId,
      payload: {
        slug: agent.slug,
        capabilityCount: activeCaps.length,
      },
    });

    return published;
  }
}
