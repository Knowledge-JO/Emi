import { Injectable } from '@nestjs/common';

// TODO: Compile the bound graph into a persisted workflow + steps: dependencies, payment rail per
// step (x402 for capabilities, ERC-8183 for jobs), retry policy, and whether the run is
// short-lived (BullMQ) or durable (Temporal).
@Injectable()
export class WorkflowBuilderService {}
