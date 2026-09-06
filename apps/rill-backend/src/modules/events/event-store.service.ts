import { Injectable } from '@nestjs/common';

// TODO: Append-only event writes and typed replay queries. Events are immutable: corrections are
// new events, never updates.
@Injectable()
export class EventStoreService {}
