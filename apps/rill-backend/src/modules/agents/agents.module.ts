import { Module } from '@nestjs/common';

import { CopyTradeAgentAdapter } from './adapters/copy-trade.adapter';
import { LiquidityAgentAdapter } from './adapters/liquidity-agent.adapter';
import { LoanAgentAdapter } from './adapters/loan-agent.adapter';
import { ResearchAgentAdapter } from './adapters/research-agent.adapter';
import { RiskAgentAdapter } from './adapters/risk-agent.adapter';
import { SwapAgentAdapter } from './adapters/swap-agent.adapter';
import { TokenAgentAdapter } from './adapters/token-agent.adapter';
import { SkillsController } from './skills.controller';
import { SkillRegistryService } from './skills/skill-registry.service';

/**
 * Agent network. Skills are competence (public playbooks). Adapters load a playbook and
 * never construct a signer — WalletModule is the only place a Session exists.
 */
@Module({
  controllers: [SkillsController],
  providers: [
    SkillRegistryService,
    SwapAgentAdapter,
    ResearchAgentAdapter,
    LoanAgentAdapter,
    RiskAgentAdapter,
    CopyTradeAgentAdapter,
    TokenAgentAdapter,
    LiquidityAgentAdapter,
  ],
  exports: [
    SkillRegistryService,
    SwapAgentAdapter,
    ResearchAgentAdapter,
    LoanAgentAdapter,
    RiskAgentAdapter,
    CopyTradeAgentAdapter,
    TokenAgentAdapter,
    LiquidityAgentAdapter,
  ],
})
export class AgentsModule {}
