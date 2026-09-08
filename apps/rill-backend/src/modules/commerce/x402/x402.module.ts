import { Module } from '@nestjs/common';

import { WalletModule } from '../../wallet/wallet.module';
import { X402CallerGuard } from './x402-caller.guard';
import { X402ClientService } from './x402-client.service';
import { X402Controller } from './x402.controller';
import { HttpX402Facilitator, X402_FACILITATOR } from './x402-facilitator';
import { X402LedgerService } from './x402-ledger.service';
import { X402MerchantController } from './x402-merchant.controller';
import { X402PaymentGuard } from './x402-payment.guard';
import { X402RailService } from './x402-rail.service';
import { X402SettlementService } from './x402-settlement.service';

/**
 * The x402 rail, in both directions. Separate module and tables from ERC-8183.
 * WalletModule restores the session; this module never imports a Session or a signer.
 */
@Module({
  imports: [WalletModule],
  controllers: [X402Controller, X402MerchantController],
  providers: [
    X402CallerGuard,
    X402ClientService,
    X402LedgerService,
    X402PaymentGuard,
    X402RailService,
    X402SettlementService,
    { provide: X402_FACILITATOR, useClass: HttpX402Facilitator },
  ],
  exports: [X402ClientService, X402LedgerService],
})
export class X402Module {}
