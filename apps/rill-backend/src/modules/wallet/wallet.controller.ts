import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { RegisterPasskeyWalletDto } from './dto/register-passkey-wallet.dto';
import { WalletService, type WalletResponse } from './wallet.service';

// TODO: Session grants and revocations, and the agent-wallet provisioning path.
@Controller('wallets')
@UseGuards(PrivyAuthGuard)
export class WalletController {
  constructor(
    private readonly auth: AuthService,
    private readonly wallets: WalletService,
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
}
