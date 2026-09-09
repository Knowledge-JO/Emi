import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { CreatePlanDto } from './create-plan.dto';
import { GrantPlanDto } from './grant-plan.dto';
import { RevokeSessionDto } from '../wallet/dto/revoke-session.dto';
import { OrchestratorService } from './orchestrator.service';

/**
 * Planning, grant and execute are separate calls. POST returns a workflow + authorization
 * plan. Grant records the on-chain session the browser already created. Execute restores
 * that session and runs the bound skill playbook.
 */
@Controller('orchestrator')
@UseGuards(PrivyAuthGuard)
export class OrchestratorController {
  constructor(
    private readonly auth: AuthService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  @Post('plans')
  async create(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Body() body: CreatePlanDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.orchestrator.planForUser(user.id, body.intentId, body.selections);
  }

  @Post('plans/:id/grant')
  async grant(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: GrantPlanDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.orchestrator.grantForUser(user.id, id, body);
  }

  @Post('plans/:id/revoke')
  async revoke(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RevokeSessionDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.orchestrator.revokeForUser(user.id, id, {
      revokeTxHash: body.revokeTxHash,
    });
  }

  @Post('plans/:id/execute')
  async execute(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.orchestrator.executeForUser(user.id, id);
  }

  @Get('plans/:id')
  async get(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.orchestrator.getPlanForUser(user.id, id);
  }
}
