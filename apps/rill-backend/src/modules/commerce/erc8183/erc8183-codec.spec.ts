import { toFunctionSelector } from 'viem';

import { encodeHireCalls, hirePermissions } from './erc8183-abi';
import { ERC8183_STACK } from './erc8183-addresses';
import { specHash, verifyManifestText, encodeManifest, manifestHash } from './erc8183-codec';
import { mirrorLocalStatus } from './job-status';

const stack = ERC8183_STACK[56];

describe('ERC-8183 codec', () => {
  it('hashes a spec stably', () => {
    const hash = specHash({
      task: 'swap 5 usdt',
      workerSlug: 'swapmaster',
      capabilityName: 'swap',
    });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(
      specHash({
        capabilityName: 'swap',
        workerSlug: 'swapmaster',
        task: 'swap 5 usdt',
      }),
    ).toBe(hash);
  });

  it('encodes the five hire calls with selector-scoped signatures', () => {
    const calls = encodeHireCalls({
      stack,
      jobId: 7n,
      provider: '0x1111111111111111111111111111111111111111',
      description: '0x' + 'ab'.repeat(32),
      budget: 10_000_000_000_000_000n,
      expiredAt: 1_800_000_000n,
    });

    expect(calls).toHaveLength(5);
    expect(calls.map((call) => call.signature)).toEqual([
      'createJob(address,address,uint256,string,address)',
      'registerJob(uint256,address)',
      'setBudget(uint256,uint256,bytes)',
      'approve(address,uint256)',
      'fund(uint256,uint256,bytes)',
    ]);
    for (const call of calls) {
      expect(call.data.startsWith(toFunctionSelector(call.signature))).toBe(true);
    }
    expect(hirePermissions(stack).some((row) => row.to === stack.commerce)).toBe(
      true,
    );
  });

  it('verifies a manifest against its keccak', () => {
    const manifest = {
      version: 1 as const,
      job_id: 7,
      chain_id: 56,
      contracts: {
        commerce: stack.commerce,
        router: stack.router,
        policy: stack.policy,
      },
      response: { content: '{"ok":true}', content_type: 'application/json' },
      metadata: {},
    };
    const text = encodeManifest(manifest);
    const hash = manifestHash(manifest);
    expect(verifyManifestText(text, hash)).toBe(true);
    expect(verifyManifestText(text + ' ', hash)).toBe(false);
  });
});

describe('mirrorLocalStatus', () => {
  it('keeps off-chain accepted while the kernel is still SUBMITTED', () => {
    expect(mirrorLocalStatus('SUBMITTED', 'accepted')).toBe('accepted');
    expect(mirrorLocalStatus('SUBMITTED', 'funded')).toBe('delivered');
    expect(mirrorLocalStatus('COMPLETED', 'accepted')).toBe('settled');
    expect(mirrorLocalStatus('REJECTED', 'delivered')).toBe('disputed');
  });
});
