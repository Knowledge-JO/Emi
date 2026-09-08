import { Injectable } from '@nestjs/common';

import type { AgentPlaybookView } from '../agent.interface';

/**
 * Risk Oracle. Per-request x402 — other agents buy `/capabilities/risk-analysis`.
 * No on-chain writes. This adapter never constructs a signer.
 */
@Injectable()
export class RiskAgentAdapter {
  readonly resourcePath = '/capabilities/risk-analysis';

  playbook(): AgentPlaybookView {
    return {
      skillId: null,
      writeOnchain: false,
      callAddresses: [],
      may: ['Read a position and report health factor'],
      mayNot: ['Submit any transaction', 'Open escrow'],
    };
  }
}
