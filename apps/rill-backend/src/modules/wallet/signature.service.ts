import { Injectable } from '@nestjs/common';

// TODO: Offline signing and verification — client.signOrder for session-key ERC-1271 signatures
// over a digest, and approveSignatureChecker to authorize who may verify them (PERMIT2_ADDRESS
// for the permit2 rail, the token itself for EIP-3009).
// These are smart-account signatures: verifiers must call isValidSignature, not ecrecover.
@Injectable()
export class SignatureService {}
