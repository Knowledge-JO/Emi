import { Controller, Get, UseGuards } from '@nestjs/common';

import { X402PaymentGuard } from './x402-payment.guard';

/**
 * Emi's own paid capabilities. Unpaid requests get HTTP 402 with the price.
 * Paid requests have already settled before this handler runs.
 */
@Controller('capabilities')
@UseGuards(X402PaymentGuard)
export class X402MerchantController {
  @Get('quote')
  quote() {
    return {
      pair: 'USDT/BNB',
      price: '0.0017',
      source: 'rill',
      paid: true,
    };
  }

  @Get('risk-analysis')
  riskAnalysis() {
    return {
      subject: 'aave-position',
      healthFactor: '1.42',
      risk: 'moderate',
      paid: true,
    };
  }
}
