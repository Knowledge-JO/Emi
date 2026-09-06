import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { IntentModule } from './modules/intent/intent.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { AgentsModule } from './modules/agents/agents.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { EventsModule } from './modules/events/events.module';

// TODO: Root module. Imports are ordered by architectural layer — platform, then domain, then
// execution — and the dependency direction must stay one-way:
//   intent → marketplace → orchestrator → commerce → execution → wallet → chain
// A lower layer never imports an upper one.
@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    EventsModule,
    UsersModule,
    AuthModule,
    WalletModule,
    IdentityModule,
    IntentModule,
    MarketplaceModule,
    OrchestratorModule,
    AgentsModule,
    CommerceModule,
    ExecutionModule,
    BlockchainModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
