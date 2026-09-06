import { Injectable } from '@nestjs/common';

// TODO: Resolve a step to its protocol adapter, build the calls, simulate, then execute via the
// session. Pre-flight every execution against the session's allowlist and spend cap so a
// violation is caught before it reverts on-chain.
@Injectable()
export class ExecutionService {}
