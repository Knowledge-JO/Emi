import { Module } from '@nestjs/common';

// TODO: The brain of the backend:
//   intent → planner → capability graph → discovery → ranking → workflow builder
//         → authorization plan → execution
// Hard rule: the planner LLM plans. It holds no keys, no wallet and no chain access.
@Module({})
export class OrchestratorModule {}
