import { Injectable } from '@nestjs/common';

// TODO: Bind each capability-graph node to a concrete agent using discovery + ranking, and record
// the chosen alternates so a failed step can fail over without replanning from scratch.
@Injectable()
export class AgentSelectionService {}
