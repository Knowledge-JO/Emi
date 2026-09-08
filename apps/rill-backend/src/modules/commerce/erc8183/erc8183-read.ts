import type { Hex } from 'viem';

import {
  ERC8183_COMMERCE_ABI,
  ERC8183_POLICY_ABI,
  JOB_STATUS,
  type JobStatusName,
} from './erc8183-abi';
import type { Erc8183Stack } from './erc8183-addresses';

export const ERC8183_CHAIN_READER = Symbol('ERC8183_CHAIN_READER');

export type Erc8183ChainReader = {
  jobCounter(commerce: Hex): Promise<bigint>;
  getJob(commerce: Hex, jobId: bigint): Promise<OnchainJob>;
  disputeWindow(policy: Hex): Promise<bigint>;
};

export type OnchainJob = {
  id: bigint;
  client: string;
  provider: string;
  evaluator: string;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  statusName: JobStatusName | 'UNKNOWN';
  hook: string;
  submittedAt: bigint;
  deliverable: Hex;
};

export type LiveJobRead = {
  job: OnchainJob;
  nextJobId: bigint;
  disputeWindow: bigint;
};

export async function readNextJobId(
  reader: Erc8183ChainReader,
  stack: Erc8183Stack,
): Promise<bigint> {
  const counter = await reader.jobCounter(stack.commerce as Hex);
  return counter + 1n;
}

export async function readOnchainJob(
  reader: Erc8183ChainReader,
  stack: Erc8183Stack,
  jobId: bigint,
): Promise<OnchainJob> {
  return reader.getJob(stack.commerce as Hex, jobId);
}

export async function readHireHints(
  reader: Erc8183ChainReader,
  stack: Erc8183Stack,
): Promise<{ nextJobId: bigint; disputeWindow: bigint }> {
  const [nextJobId, disputeWindow] = await Promise.all([
    readNextJobId(reader, stack),
    reader.disputeWindow(stack.policy as Hex),
  ]);
  return { nextJobId, disputeWindow };
}

export function statusName(status: number): JobStatusName | 'UNKNOWN' {
  return JOB_STATUS[status] ?? 'UNKNOWN';
}

export { ERC8183_COMMERCE_ABI, ERC8183_POLICY_ABI };
