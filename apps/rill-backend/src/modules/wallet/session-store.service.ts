import { Injectable } from '@nestjs/common';

// TODO: Persist and restore sessions using the split: serializeSession(session) into Postgres
// (JSON-safe, no secret) and the session private key into a secret store. Restore with
// deserializeSession(stored, signerFromPrivateKey(key)).
// Never JSON.stringify a Session — it throws on bigint limits and embeds the private key. A lossy
// round trip (bigint → number, re-cased hex) breaks on-chain validation at execute time.
@Injectable()
export class SessionStoreService {}
