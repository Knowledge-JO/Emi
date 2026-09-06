import { Injectable } from '@nestjs/common';

// TODO: Map each goal-tree node to a required capability (with assets, protocols and
// constraints), producing a DAG the marketplace can resolve node-by-node. Nodes may expand:
// "obtain repayment asset" pulls in a swap capability.
@Injectable()
export class CapabilityGraphService {}
