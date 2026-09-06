import { Injectable } from '@nestjs/common';

// TODO: Find candidate agents for a capability-graph node. Structured filters first (capability
// name, assets, protocols, chain), then pgvector similarity for semantic fallback.
@Injectable()
export class AgentDiscoveryService {}
