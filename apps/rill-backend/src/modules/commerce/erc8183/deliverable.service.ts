import { Injectable } from '@nestjs/common';

// TODO: Accept a worker agent's deliverable, hash and store it, and validate it against the job
// spec before release is proposed. What distinguishes a job from an API call is exactly this: a
// deliverable that can be checked.
@Injectable()
export class DeliverableService {}
