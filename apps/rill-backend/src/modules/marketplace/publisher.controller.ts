import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { AttachListingIdentityDto } from './dto/attach-listing-identity.dto';
import { BecomePublisherDto } from './dto/become-publisher.dto';
import { DeclareListingCapabilityDto } from './dto/declare-listing-capability.dto';
import { RegisterListingDto } from './dto/register-listing.dto';
import { PublisherService } from './publisher.service';

/**
 * Third-party self-serve registry. Humans (Privy) become publishers, list a draft, attach
 * an ERC-8004 cache + capability, then publish. Seed uses the same services without HTTP.
 */
@Controller('marketplace')
@UseGuards(PrivyAuthGuard)
export class PublisherController {
  constructor(
    private readonly auth: AuthService,
    private readonly publishers: PublisherService,
  ) {}

  @Post('publishers')
  @HttpCode(HttpStatus.OK)
  async become(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Body() body: BecomePublisherDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.publishers.become(user.id, body);
  }

  @Get('publishers/me')
  async me(@CurrentPrincipal() principal: PrivyPrincipal) {
    const user = await this.auth.requireUser(principal);
    const publisher = await this.publishers.me(user.id);
    if (!publisher) {
      throw new NotFoundException('Not a publisher yet');
    }
    return publisher;
  }

  @Post('agents')
  async register(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Body() body: RegisterListingDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.publishers.register(user.id, body);
  }

  @Post('agents/:slug/identity')
  @HttpCode(HttpStatus.OK)
  async attachIdentity(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('slug') slug: string,
    @Body() body: AttachListingIdentityDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.publishers.attachIdentity(user.id, slug, body);
  }

  @Post('agents/:slug/capabilities')
  async declareCapability(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('slug') slug: string,
    @Body() body: DeclareListingCapabilityDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.publishers.declareCapability(user.id, slug, body);
  }

  @Post('agents/:slug/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('slug') slug: string,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.publishers.publish(user.id, slug);
  }
}
