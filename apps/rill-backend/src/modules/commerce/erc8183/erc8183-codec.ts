import { keccak256, toHex, type Hex } from 'viem';

import { canonicalJson } from './canonical-json';

export type JobSpec = {
  task: string;
  workerSlug: string;
  capabilityName: string;
  taxonomyKey?: string;
  metadata?: Record<string, unknown>;
};

export type Erc8183DeliverableManifest = {
  version: 1;
  job_id: number;
  chain_id: number;
  contracts: {
    commerce: string;
    router: string;
    policy: string;
  };
  response: {
    content: string;
    content_type: string;
  };
  metadata: Record<string, unknown>;
};

export function specHash(spec: JobSpec): Hex {
  return keccak256(toHex(canonicalJson(spec)));
}

export function encodeManifest(manifest: Erc8183DeliverableManifest): string {
  return canonicalJson(manifest);
}

export function manifestHash(manifest: Erc8183DeliverableManifest): Hex {
  return keccak256(toHex(encodeManifest(manifest)));
}

export function contentHash(payload: Record<string, unknown>): Hex {
  return keccak256(toHex(canonicalJson(payload)));
}

export function verifyManifestText(text: string, deliverable: Hex): boolean {
  return keccak256(toHex(text)).toLowerCase() === deliverable.toLowerCase();
}

export function encodeDeliverableOptParams(url: string): Hex {
  return toHex(JSON.stringify({ deliverable_url: url }));
}
