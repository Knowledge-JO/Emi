import { Injectable } from '@nestjs/common';

// TODO: Drive the pipeline end to end and own its state machine. Emits an event at every
// transition so a run can be audited and replayed.
@Injectable()
export class OrchestratorService {}
