import { encodeFunctionData, type Hex } from 'viem';

/** ERC-8004 registry is an ERC-721; tokenURI is the identity record. */
export const ERC8004_REGISTRY_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'metadataKey', type: 'string' },
          { name: 'metadataValue', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'setAgentURI',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    outputs: [],
  },
] as const;

export type RegistryCall = {
  to: string;
  data: Hex;
  value: '0';
  signature: string;
};

export function encodeRegisterCall(
  registry: string,
  agentUri: string,
): RegistryCall {
  return {
    to: registry.toLowerCase(),
    data: encodeFunctionData({
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'register',
      args: [agentUri, []],
    }),
    value: '0',
    signature: 'register(string,(string,bytes)[])',
  };
}

export function encodeSetAgentUriCall(
  registry: string,
  agentId: bigint,
  agentUri: string,
): RegistryCall {
  return {
    to: registry.toLowerCase(),
    data: encodeFunctionData({
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [agentId, agentUri],
    }),
    value: '0',
    signature: 'setAgentURI(uint256,string)',
  };
}
