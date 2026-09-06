import { Injectable } from '@nestjs/common';

// TODO: LLM planner. Input: goal tree + available capabilities. Output: a schema-validated,
// deterministic step plan. The model proposes structure only — it never receives signer material,
// never chooses an address, and its output is validated before anything downstream trusts it.
@Injectable()
export class PlannerService {}
