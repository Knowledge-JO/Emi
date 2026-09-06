import { Injectable } from '@nestjs/common';

// TODO: Settle verified payments through the facilitator and confirm on-chain. A capability
// result is only returned once settlement is confirmed or the payment is provably collectable.
@Injectable()
export class X402SettlementService {}
