import { Injectable } from '@nestjs/common';

import type {
  CapabilityGraphNode,
  ParsedIntent,
} from '../../database/schema/intents';
import {
  buildCapabilityGraph,
  planCapabilityGraph,
} from './capability-graph';

export { buildCapabilityGraph, planCapabilityGraph } from './capability-graph';

/**
 * Step 4: map a parsed intent onto requirements the marketplace can resolve. Still no agent.
 * A swap is one node. A protect intent is a DAG against first-party taxonomy keys.
 */
@Injectable()
export class CapabilityGraphService {
  build(intent: ParsedIntent): CapabilityGraphNode[] {
    return buildCapabilityGraph(intent);
  }

  plan(
    intent: ParsedIntent,
    available?: readonly string[],
  ): CapabilityGraphNode[] {
    return planCapabilityGraph(intent, available);
  }
}
