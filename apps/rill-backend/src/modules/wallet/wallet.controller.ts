import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { BalancesService } from './balances.service';
import { RegisterPasskeyWalletDto } from './dto/register-passkey-wallet.dto';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { SessionService } from './session.service';
import { WalletService, type WalletResponse } from './wallet.service';
import { X402SessionService } from './x402-session.service';

/**
 * Wallet reads and session records. Grants and revokes are signed in the browser (passkey
 * admin). This controller never constructs a signer.
 */
@Controller('wallets')
@UseGuards(PrivyAuthGuard)
export class WalletController {
  constructor(
    private readonly auth: AuthService,
    private readonly wallets: WalletService,
    private readonly balances: BalancesService,
    private readonly sessions: SessionService,
    private readonly x402Sessions: X402SessionService,
  ) {}

  /**
   * The caller's wallet. 404 while they have none, which is how the client knows to run the
   * passkey ceremony — an empty body would make "no wallet yet" and "request failed" look alike.
   */
  @Get('me')
  async me(
    @CurrentPrincipal() principal: PrivyPrincipal,
  ): Promise<WalletResponse> {
    const user = await this.auth.requireUser(principal);
    const wallet = await this.wallets.findForUser(user.id);

    if (!wallet) throw new NotFoundException('No wallet provisioned yet');

    return this.wallets.toResponse(wallet);
  }

  /**
   * Records the wallet the browser just created. 200 rather than 201 on a repeat of the same
   * address: the ceremony already happened, and this call only catches the record up.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async register(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Body() body: RegisterPasskeyWalletDto,
  ): Promise<WalletResponse> {
    const user = await this.auth.requireUser(principal);
    const { wallet } = await this.wallets.registerPasskeyWallet(user, body);

    return this.wallets.toResponse(wallet);
  }

  @Get('me/balances')
  async balancesForMe(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Query('tokens') tokens?: string,
  ) {
    const user = await this.auth.requireUser(principal);
    const wanted = tokens
      ?.split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    return this.balances.forUser(user.id, wanted);
  }

  @Get('sessions/:id')
  async session(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.sessions.getForUser(user.id, id);
  }

  /**
   * Encodes approve(Permit2) + setSignatureCheckerApproval for the browser passkey.
   * This does not submit — the admin signer cannot live in this process.
   */
  @Get('sessions/:id/x402-provision-calls')
  async x402ProvisionCalls(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') token?: string,
  ) {
    if (!token || !/^0x[0-9a-fA-F]{40}$/.test(token)) {
      throw new BadRequestException('token must be a 20-byte hex address');
    }
    const user = await this.auth.requireUser(principal);
    const calls = await this.x402Sessions.provisionCallsForUser(
      user.id,
      id,
      token,
    );
    return {
      sessionId: id,
      token: token.toLowerCase(),
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? '0x',
        value: (call.value ?? 0n).toString(),
      })),
    };
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RevokeSessionDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.sessions.recordRevokeForUser(user.id, id, {
      revokeTxHash: body.revokeTxHash,
    });
  }
}
