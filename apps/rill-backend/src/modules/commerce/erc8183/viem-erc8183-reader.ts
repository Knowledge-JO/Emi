import { Inject, Injectable } from '@nestjs/common';
import type { Hex } from 'viem';

import {
  CHAIN_PUBLIC_CLIENT,
  type ChainPublicClient,
} from '../../blockchain/chain-client.provider';
import {
  ERC8183_COMMERCE_ABI,
  ERC8183_POLICY_ABI,
} from './erc8183-abi';
import type { Erc8183ChainReader, OnchainJob } from './erc8183-read';
import { statusName } from './erc8183-read';

@Injectable()
export class ViemErc8183ChainReader implements Erc8183ChainReader {
  constructor(
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
  ) {}

  jobCounter(commerce: Hex): Promise<bigint> {
    return this.client.readContract({
      address: commerce,
      abi: ERC8183_COMMERCE_ABI,
      functionName: 'jobCounter',
    });
  }

  async getJob(commerce: Hex, jobId: bigint): Promise<OnchainJob> {
    const job = await this.client.readContract({
      address: commerce,
      abi: ERC8183_COMMERCE_ABI,
      functionName: 'getJob',
      args: [jobId],
    });

    return {
      id: job.id,
      client: job.client.toLowerCase(),
      provider: job.provider.toLowerCase(),
      evaluator: job.evaluator.toLowerCase(),
      description: job.description,
      budget: job.budget,
      expiredAt: job.expiredAt,
      status: job.status,
      statusName: statusName(job.status),
      hook: job.hook.toLowerCase(),
      submittedAt: job.submittedAt,
      deliverable: job.deliverable,
    };
  }

  disputeWindow(policy: Hex): Promise<bigint> {
    return this.client.readContract({
      address: policy,
      abi: ERC8183_POLICY_ABI,
      functionName: 'disputeWindow',
    });
  }
}
