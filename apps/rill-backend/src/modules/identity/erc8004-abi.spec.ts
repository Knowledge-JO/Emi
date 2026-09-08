import { toFunctionSelector } from 'viem';

import { encodeRegisterCall, encodeSetAgentUriCall } from './erc8004-abi';

const REGISTRY = '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';

describe('erc8004 write encoding', () => {
  it('encodes register with the selector-scoped signature, never a registry-wide grant', () => {
    const call = encodeRegisterCall(REGISTRY, 'data:application/json;base64,e30=');

    expect(call.to).toBe(REGISTRY);
    expect(call.value).toBe('0');
    expect(call.signature).toBe('register(string,(string,bytes)[])');
    expect(call.data.startsWith(toFunctionSelector(call.signature))).toBe(true);
  });

  it('encodes setAgentURI against the same registry', () => {
    const call = encodeSetAgentUriCall(REGISTRY, 42n, 'data:application/json;base64,e30=');

    expect(call.to).toBe(REGISTRY);
    expect(call.signature).toBe('setAgentURI(uint256,string)');
    expect(call.data.startsWith(toFunctionSelector(call.signature))).toBe(true);
  });
});
