import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import {
  capabilityProtocols,
  protocolContracts,
  protocols,
  type CapabilityGraphNode,
} from '../../database/schema';
import { CHAIN_IDS } from '../../database/seed/ids';
import { SkillRegistryService } from '../agents/skills/skill-registry.service';
import { CatalogService } from '../marketplace/catalog.service';
import {
  buildAuthorizationPlan,
  intersectAllowlist,
  type AllowlistedContract,
  type PlanStepInput,
  type SpendAsset,
} from './authorization-plan';

/**
 * Turn bound steps into the narrowest Altana session a human can approve. Never widens a scope
 * so a step can succeed. Does not grant anything — `permissions` rows wait for a real session.
 * Skill call targets only intersect the capability's protocol allowlist; they never add to it.
 */
@Injectable()
export class AuthorizationPlannerService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly catalog: CatalogService,
    private readonly skills: SkillRegistryService,
  ) {}

  async planForSteps(
    steps: Array<{
      node: CapabilityGraphNode;
      capabilityId: string;
      expectedDurationSeconds: number | null;
      skillId: string | null;
    }>,
    now: Date = new Date(),
  ) {
    const inputs: PlanStepInput[] = [];

    for (const step of steps) {
      const chainId = chainIdFor(step.node);
      const skill = step.skillId
        ? this.skills.get(step.skillId)
        : this.skills.forTaxonomy(step.node.taxonomyKey);
      let contracts = await this.loadAllowlistedContracts(
        step.capabilityId,
        chainId,
      );
      if (skill) {
        contracts = intersectAllowlist(contracts, skill.callAddresses);
      }

      const writeOnchain = skill?.writeOnchain ?? true;
      const fromSymbol =
        typeof step.node.input?.fromSymbol === 'string'
          ? step.node.input.fromSymbol
          : null;
      const amount =
        typeof step.node.input?.amount === 'string'
          ? step.node.input.amount
          : null;

      inputs.push({
        contracts,
        spendAsset:
          writeOnchain && fromSymbol
            ? await this.loadSpendAsset(chainId, fromSymbol)
            : null,
        amount: writeOnchain ? amount : null,
        expectedDurationSeconds: step.expectedDurationSeconds,
        writeOnchain,
      });
    }

    return buildAuthorizationPlan(inputs, Math.floor(now.getTime() / 1000));
  }

  private async loadAllowlistedContracts(
    capabilityId: string,
    chainId: number,
  ): Promise<AllowlistedContract[]> {
    const rows = await this.db
      .select({
        address: protocolContracts.address,
        role: protocolContracts.role,
        slug: protocols.slug,
      })
      .from(capabilityProtocols)
      .innerJoin(protocols, eq(protocols.id, capabilityProtocols.protocolId))
      .innerJoin(
        protocolContracts,
        eq(protocolContracts.protocolId, protocols.id),
      )
      .where(
        and(
          eq(capabilityProtocols.capabilityId, capabilityId),
          eq(protocolContracts.chainId, chainId),
          eq(protocolContracts.allowlistable, true),
        ),
      );

    return rows.map((row) => ({
      address: row.address,
      protocolSlug: row.slug,
      role: row.role,
    }));
  }

  private async loadSpendAsset(
    chainId: number,
    symbol: string,
  ): Promise<SpendAsset | null> {
    const { rows } = await this.catalog.findAssetsBySymbols(chainId, [symbol]);
    const row = rows[0];
    if (!row) return null;
    return {
      symbol: row.symbol,
      address: row.address,
      decimals: row.decimals,
      isNative: row.isNative,
    };
  }
}

function chainIdFor(node: CapabilityGraphNode): number {
  const chain = node.input?.chain;
  if (chain === 'bnb' || chain === 'bnb-testnet' || chain === 'ethereum') {
    return CHAIN_IDS[chain];
  }
  return CHAIN_IDS.unspecified;
}
