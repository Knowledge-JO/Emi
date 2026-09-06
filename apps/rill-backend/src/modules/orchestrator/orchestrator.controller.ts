import { Controller } from '@nestjs/common';

// TODO: Plan an intent, return the proposed workflow + cost estimate + authorization plan for
// approval, then start execution. Planning and execution are separate calls — nothing runs until
// the user has approved the scope of authority being granted.
@Controller('orchestrator')
export class OrchestratorController {}
