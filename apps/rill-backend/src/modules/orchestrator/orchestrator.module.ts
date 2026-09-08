import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CommerceModule } from '../commerce/commerce.module';
import { ExecutionModule } from '../execution/execution.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { WalletModule } from '../wallet/wallet.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AgentRouterService } from './agent-router.service';
import { AgentSelectionService } from './agent-selection.service';
import { AuthorizationPlannerService } from './authorization-planner.service';
import { ExecutionProcessor } from './execution.processor';
import { LoanGuardianComposerService } from './loan-guardian-composer.service';
import { LoanProtectionActivitiesService } from './loan-protection.activities';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { WorkflowBuilderService } from './workflow-builder.service';

/**
 * Binds ranked agents to a workflow and produces an authorization plan. The planner LLM lives
 * in IntentModule. This module walks the DAG and dispatches each step over the named rail.
 * It holds no keys and never talks to Altana. Loan Guardian composes peer hires here.
 */
@Module({
  imports: [
    MarketplaceModule,
    WalletModule,
    AgentsModule,
    ExecutionModule,
    CommerceModule,
    WorkflowsModule,
    BlockchainModule,
  ],
  controllers: [OrchestratorController],
  providers: [
    AgentSelectionService,
    WorkflowBuilderService,
    AuthorizationPlannerService,
    AgentRouterService,
    OrchestratorService,
    ExecutionProcessor,
    LoanGuardianComposerService,
    LoanProtectionActivitiesService,
  ],
  exports: [OrchestratorService, LoanProtectionActivitiesService],
})
export class OrchestratorModule {}
