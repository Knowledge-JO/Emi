import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { ApiKeyGuard, CurrentAgent } from '../auth/api-key.guard';
import type { AgentPrincipal } from '../auth/api-key.service';
import { ApiKeyService } from '../auth/api-key.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { IssueAgentKeyDto } from './dto/issue-agent-key.dto';
import { IdentityCardService } from './identity-card.service';

/**
 * Counterparty verification. GET is public so another agent can check who they are about to
 * hire without a Privy session. Writes (sync, issue key) are human-gated. `/me` is the agent
 * credential — an API key resolved to this ERC-8004 cache.
 */
@Controller('identities')
export class IdentityController {
  constructor(
    private readonly cards: IdentityCardService,
    private readonly keys: ApiKeyService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  @UseGuards(ApiKeyGuard)
  me(@CurrentAgent() agent: AgentPrincipal) {
    return this.cards.cardForAgentId(agent.agentId);
  }

  @Get(':slug')
  get(
    @Param('slug') slug: string,
    @Query('live') live?: string,
  ) {
    return this.cards.getBySlug(slug, live === '1' || live === 'true');
  }

  @Post(':slug/sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PrivyAuthGuard)
  async sync(
    @Param('slug') slug: string,
    @CurrentPrincipal() principal: PrivyPrincipal,
  ) {
    await this.auth.requireUser(principal);
    return this.cards.syncBySlug(slug);
  }

  @Get(':slug/registration-calls')
  @UseGuards(PrivyAuthGuard)
  async registrationCalls(
    @Param('slug') slug: string,
    @CurrentPrincipal() principal: PrivyPrincipal,
  ) {
    await this.auth.requireUser(principal);
    return this.cards.registrationCalls(slug);
  }

  @Post(':slug/keys')
  @UseGuards(PrivyAuthGuard)
  async issueKey(
    @Param('slug') slug: string,
    @Body() body: IssueAgentKeyDto,
    @CurrentPrincipal() principal: PrivyPrincipal,
  ) {
    const user = await this.auth.requireUser(principal);
    const listing = await this.cards.assertDeveloperOwns(slug, user.id);
    return this.keys.issueForAgent(listing.id, body.name ?? listing.slug);
  }
}
