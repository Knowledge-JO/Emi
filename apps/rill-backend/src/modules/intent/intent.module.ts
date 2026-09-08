import { Module } from '@nestjs/common';

import { MarketplaceModule } from '../marketplace/marketplace.module';
import { CapabilityGraphService } from './capability-graph.service';
import { IntentController } from './intent.controller';
import { IntentParserService } from './intent-parser.service';
import { IntentPlannerService } from './intent-planner.service';
import { IntentService } from './intent.service';

/**
 * Intent Engine — turns "swap 5 USDT for BNB" into a schema-validated object, a goal tree, and a
 * capability graph. It resolves *what must happen*; the marketplace it imports picks agents.
 * It never signs.
 */
@Module({
  imports: [MarketplaceModule],
  controllers: [IntentController],
  providers: [
    IntentParserService,
    IntentPlannerService,
    CapabilityGraphService,
    IntentService,
  ],
  exports: [IntentService],
})
export class IntentModule {}
