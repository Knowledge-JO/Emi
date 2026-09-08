import { Injectable } from '@nestjs/common';

/**
 * LP listings wait until a liquidity protocol is in the catalog. No playbook, no signer.
 */
@Injectable()
export class LiquidityAgentAdapter {
  playbook(): never {
    throw new Error(
      'Liquidity listings are not seeded — add a catalog protocol before a playbook',
    );
  }
}
