import { Injectable } from '@nestjs/common';

// TODO: Index the logs the platform depends on — ERC-8183 job state changes, ERC-8004 identity
// registrations, Keystore grants and revocations — from a persisted block cursor, idempotently so
// reorgs and restarts cannot double-apply.
@Injectable()
export class IndexerService {}
