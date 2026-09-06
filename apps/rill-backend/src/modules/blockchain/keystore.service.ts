import { Injectable } from '@nestjs/common';

// TODO: Independent on-chain verification of authority, readable by anyone — this is the
// killer property, so we use it rather than trusting our own database:
//   isValidKey(user, keyId)  answers exists AND not revoked AND not expired in one call,
//                            where keyId = keccak256(SEC1 session public key)
//   getKeys(user)            enumerates a wallet's keys
// Caution: revoked keys are removed from getKeys, but EXPIRED keys are not — expiry is a passive
// timestamp and nothing prunes the list. Always check each id with isValidKey before trusting it.
// Keystore addresses come from BNB.keyStore / ETHEREUM.keyStore in the SDK.
@Injectable()
export class KeystoreService {}
