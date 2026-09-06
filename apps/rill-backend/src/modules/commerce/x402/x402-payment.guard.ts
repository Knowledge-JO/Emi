import { Injectable } from '@nestjs/common';

// TODO: Merchant-side guard: is the payment present, valid, for the right resource, and for the
// right amount? Respond 402 with the price when absent.
// Callers are smart accounts, so signatures must be verified via ERC-1271 isValidSignature —
// ecrecover will not work.
@Injectable()
export class X402PaymentGuard {}
