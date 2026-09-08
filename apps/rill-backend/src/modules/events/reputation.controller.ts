import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { PrivyAuthGuard } from '../auth/privy-auth.guard';
import { OutboxService } from './outbox.service';
import { ReputationProjectionService } from './reputation-projection.service';

/**
 * Operator triggers. The projection job is the only writer of `reputation`; these routes
 * only ask it to run. Drain never appends — it only delivers rows written with the event.
 */
@Controller()
@UseGuards(PrivyAuthGuard)
export class ReputationController {
  constructor(
    private readonly projection: ReputationProjectionService,
    private readonly outbox: OutboxService,
  ) {}

  @Post('reputation/recompute')
  @HttpCode(HttpStatus.OK)
  recompute() {
    return this.projection.projectUpTo();
  }

  @Post('events/outbox/drain')
  @HttpCode(HttpStatus.OK)
  drain() {
    return this.outbox.drain();
  }
}
