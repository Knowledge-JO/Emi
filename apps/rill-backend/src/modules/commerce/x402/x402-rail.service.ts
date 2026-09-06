import { Injectable } from '@nestjs/common';

// TODO: One-time rail provisioning, performed as wallet admin before an agent can pay:
//   permit2 rail  — approveTokenForPermit2({ wallet, signer, token }) then
//                   approveSignatureChecker({ ..., session, checker: PERMIT2_ADDRESS })
//   EIP-3009 rail — approveSignatureChecker({ ..., checker: <token address> })
// Idempotent: check on-chain state before re-approving.
@Injectable()
export class X402RailService {}
