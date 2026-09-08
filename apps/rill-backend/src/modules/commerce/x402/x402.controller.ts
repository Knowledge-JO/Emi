import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { WalletService } from '../../wallet/wallet.service';
import { FetchX402Dto } from './dto/fetch-x402.dto';
import type { X402Caller } from './x402-caller';
import { CurrentX402Caller, X402CallerGuard } from './x402-caller.guard';
import { X402ClientService } from './x402-client.service';
import { X402LedgerService } from './x402-ledger.service';
import { X402RailService } from './x402-rail.service';

/**
 * Outbound x402 and rail provisioning. Users (Privy) and agents (`rill_ak_`) share this
 * rail. It never imports the ERC-8183 module.
 */
@Controller('x402')
@UseGuards(X402CallerGuard)
export class X402Controller {
  constructor(
    private readonly client: X402ClientService,
    private readonly rail: X402RailService,
    private readonly ledger: X402LedgerService,
    private readonly wallets: WalletService,
  ) {}

  @Post('fetch')
  fetch(@CurrentX402Caller() caller: X402Caller, @Body() body: FetchX402Dto) {
    return this.client.fetch(caller, body);
  }

  @Get('payments')
  async payments(@CurrentX402Caller() caller: X402Caller) {
    if (caller.kind === 'agent') {
      return this.ledger.listForPayer({ agentId: caller.agentId });
    }
    const wallet = await this.wallets.findForUser(caller.userId);
    return this.ledger.listForPayer({ userWalletId: wallet?.id });
  }

  @Get('sessions/:id/provision-calls')
  provisionCalls(
    @CurrentX402Caller() caller: X402Caller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') token?: string,
  ) {
    return this.rail.provisionCalls(caller, id, token);
  }
}
