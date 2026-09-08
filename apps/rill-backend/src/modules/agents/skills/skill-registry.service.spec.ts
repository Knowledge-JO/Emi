import { SkillRegistryService } from './skill-registry.service';

describe('SkillRegistryService', () => {
  const registry = new SkillRegistryService();

  it('maps defi.swap to pancakeswap-trading', () => {
    expect(registry.forTaxonomy('defi.swap')?.id).toBe('pancakeswap-trading');
  });

  it('treats token radar as research with an empty call list', () => {
    const skill = registry.get('dexscreener-token-radar');
    expect(skill?.writeOnchain).toBe(false);
    expect(skill?.callAddresses).toEqual([]);
  });

  it('does not put WBNB on the pancakeswap-trading call allowlist', () => {
    const skill = registry.get('pancakeswap-trading');
    expect(skill?.callAddresses).toEqual([
      '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    ]);
    expect(skill?.addressTable.wbnb).toBe(
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    );
  });
});
