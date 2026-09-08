import { Module } from '@nestjs/common';

import { Erc8183Module } from './erc8183/erc8183.module';
import { X402Module } from './x402/x402.module';

/**
 * Agent commerce. Two rails, never one code path:
 *   x402     — pay for a capability (small, fast, per-request)
 *   ERC-8183 — hire an agent for a job (deliverable, held in escrow)
 */
@Module({
  imports: [Erc8183Module, X402Module],
  exports: [Erc8183Module, X402Module],
})
export class CommerceModule {}
