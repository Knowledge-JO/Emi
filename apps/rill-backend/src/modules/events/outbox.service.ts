import { Injectable } from '@nestjs/common';

// TODO: Transactional outbox — write the event in the same transaction as the state change, then
// publish. Prevents "we executed on-chain but lost the record", which is unrecoverable.
@Injectable()
export class OutboxService {}
