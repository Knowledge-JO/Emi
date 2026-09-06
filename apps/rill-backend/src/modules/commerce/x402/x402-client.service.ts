import { Injectable } from '@nestjs/common';

// TODO: Outbound payments — client.fetchWithX402({ session, url }) signs an ERC-1271 payment
// authorization and retries with an X-PAYMENT header.
// Must run server-side: third-party x402 endpoints often omit X-PAYMENT from CORS, so browsers
// cannot POST the payment.
// The envelope is emitted in both wire dialects (X-PAYMENT and PAYMENT-SIGNATURE, permit and
// permit2Authorization), so b402 merchants and Altana-integrated services can each read it.
@Injectable()
export class X402ClientService {}
