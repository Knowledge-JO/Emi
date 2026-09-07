import { Module } from '@nestjs/common';

import { IntentController } from './intent.controller';
import { IntentParserService } from './intent-parser.service';
import { IntentService } from './intent.service';

/**
 * Intent Engine — turns "swap 5 USDT for BNB" into a schema-validated object and a goal tree.
 * It resolves *what must happen*; it never picks agents (marketplace) or signs anything (wallet).
 */
@Module({
  controllers: [IntentController],
  providers: [IntentParserService, IntentService],
  exports: [IntentService],
})
export class IntentModule {}
