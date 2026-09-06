import { Module } from '@nestjs/common';

// TODO: Execution layer — the only place raw calldata is built. Orchestrator and agents express
// intent-level steps ("swap 100 USDT for BNB"); this module turns them into calls and hands them
// to the wallet module to sign with a scoped session.
@Module({})
export class ExecutionModule {}
