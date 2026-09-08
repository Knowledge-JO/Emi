import { Logger } from '@nestjs/common';
import { Client, Connection } from '@temporalio/client';

import type { LoanProtectionInput } from './loan-protection';
import type { TemporalHandle, TemporalRuntime } from './temporal-runtime';
import { MemoryTemporalRuntime } from './temporal-runtime';

const logger = new Logger('TemporalClientRuntime');

export class TemporalClientRuntime implements TemporalRuntime {
  constructor(
    private readonly client: Client,
    private readonly taskQueue: string,
    private readonly fallback: TemporalRuntime,
  ) {}

  static async connect(input: {
    address: string;
    namespace: string;
    taskQueue: string;
  }): Promise<TemporalRuntime> {
    const fallback = new MemoryTemporalRuntime();
    try {
      const connection = await Connection.connect({
        address: input.address,
        connectTimeout: 1_000,
      });
      const client = new Client({
        connection,
        namespace: input.namespace,
      });
      logger.log(`Temporal connected at ${input.address}`);
      return new TemporalClientRuntime(client, input.taskQueue, fallback);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'connect failed';
      logger.warn(`Temporal unavailable (${message}); recording handles locally`);
      return fallback;
    }
  }

  async startLoanProtection(
    input: LoanProtectionInput,
  ): Promise<TemporalHandle> {
    try {
      const handle = await this.client.workflow.start('loanProtection', {
        taskQueue: this.taskQueue,
        workflowId: `loan-${input.workflowId}`,
        args: [input],
      });
      return {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'start failed';
      logger.warn(`Temporal start failed (${message}); recording handle locally`);
      return this.fallback.startLoanProtection(input);
    }
  }
}
