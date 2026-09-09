import { applyEnvFile, isBlankEnvValue, readEnvVar, upsertEnvVar } from './env-file';

describe('env-file', () => {
  it('upserts an empty assignment in place', () => {
    const { text, changed } = upsertEnvVar(
      'X402_FACILITATOR_URL=\nX402_MERCHANT_ADDRESS=\n',
      'X402_FACILITATOR_URL',
      'https://x402.dexter.cash',
    );
    expect(changed).toBe(true);
    expect(readEnvVar(text, 'X402_FACILITATOR_URL')).toBe(
      'https://x402.dexter.cash',
    );
    expect(readEnvVar(text, 'X402_MERCHANT_ADDRESS')).toBe('');
  });

  it('appends when the key is missing', () => {
    const { text, changed } = upsertEnvVar('FOO=1\n', 'BAR', '2');
    expect(changed).toBe(true);
    expect(text).toBe('FOO=1\nBAR=2\n');
  });

  it('is a no-op when the value is already set', () => {
    const source = 'X402_MERCHANT_ADDRESS=0x1111111111111111111111111111111111111111\n';
    const { text, changed } = upsertEnvVar(
      source,
      'X402_MERCHANT_ADDRESS',
      '0x1111111111111111111111111111111111111111',
    );
    expect(changed).toBe(false);
    expect(text).toBe(source);
  });

  it('treats blank values as unset', () => {
    expect(isBlankEnvValue(undefined)).toBe(true);
    expect(isBlankEnvValue('')).toBe(true);
    expect(isBlankEnvValue('  ')).toBe(true);
    expect(isBlankEnvValue('https://x402.dexter.cash')).toBe(false);
  });

  it('does not overwrite process.env when loading a file', () => {
    const previous = process.env.X402_FACILITATOR_URL;
    process.env.X402_FACILITATOR_URL = 'https://already.set';
    applyEnvFile('X402_FACILITATOR_URL=https://from.file\n');
    expect(process.env.X402_FACILITATOR_URL).toBe('https://already.set');
    if (previous === undefined) delete process.env.X402_FACILITATOR_URL;
    else process.env.X402_FACILITATOR_URL = previous;
  });
});
