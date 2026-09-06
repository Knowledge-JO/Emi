import { Injectable } from '@nestjs/common';

// TODO: Health-check agent endpoints and track liveness, so the planner never composes a
// workflow around an agent that is offline or over capacity.
@Injectable()
export class AgentAvailabilityService {}
