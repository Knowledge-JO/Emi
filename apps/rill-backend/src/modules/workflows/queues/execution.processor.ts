import { Injectable } from '@nestjs/common';

// TODO: BullMQ processor for short-lived workflow steps. Retries with backoff; a step that
// exhausts retries marks the workflow step failed and emits an event rather than silently dying.
@Injectable()
export class ExecutionProcessor {}
