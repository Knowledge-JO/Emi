import { Injectable } from '@nestjs/common';

// TODO: Track every tx the platform originated: record it, poll for the receipt, resolve final
// status, and link it back to the workflow step that caused it.
@Injectable()
export class TransactionService {}
