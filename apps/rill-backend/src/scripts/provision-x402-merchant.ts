import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { generatePrivateKey } from 'viem/accounts';

import {
  isBlankEnvValue,
  loadEnvFiles,
  readEnvVar,
  writeEnvVar,
} from './env-file';

/**
 * Public BNB facilitator that speaks the same HTTP `/verify` + `/settle` contract
 * `HttpX402Facilitator` posts to. Coinbase CDP / x402.org do not cover BSC.
 */
export const DEFAULT_X402_FACILITATOR_URL = 'https://x402.dexter.cash';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PRIVATE_KEY = /^0x[0-9a-fA-F]{64}$/;

/**
 * Private-key admin path from Altana "Create a smart agentic wallet":
 * generate the key yourself (`viem/accounts`), persist it, then
 * `signerFromPrivateKey` → `createWallet`. The SDK never stores key material.
 *
 * Passkey wallets are the consumer path (Face ID in the browser) — not this script.
 * First `execute` is what registers the admin key in Keystore; inbound x402
 * `payTo` does not need that. Fund this address only if you will spend from it.
 *
 * Writes `X402_MERCHANT_ADDRESS` and `X402_MERCHANT_PRIVATE_KEY` into `.env`
 * (gitignored). The key is also mirrored under `.secrets/merchant/`. Never printed.
 *
 *   npm run x402:provision-merchant
 *   npm run x402:provision-merchant -- --force
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const force = process.argv.includes('--force');
  loadEnvFiles(cwd);

  const envPath = resolve(cwd, '.env');
  const secretDir = resolve(cwd, '.secrets/merchant');
  const keyPath = resolve(secretDir, 'admin.key');
  const metaPath = resolve(secretDir, 'wallet.json');

  const chain = (process.env.ALTANA_CHAIN ?? 'bnb') as
    | 'bnb'
    | 'bnb-testnet'
    | 'ethereum';
  const envContents = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const existingAddress = readEnvVar(envContents, 'X402_MERCHANT_ADDRESS');
  const existingKey = readStoredKeyValue(
    readEnvVar(envContents, 'X402_MERCHANT_PRIVATE_KEY'),
  );
  const existingFacilitator = readEnvVar(envContents, 'X402_FACILITATOR_URL');

  writeFacilitator(envPath, existingFacilitator, force);

  const { address, privateKey, reused } = await provisionWallet({
    chain,
    keyPath,
    metaPath,
    existingAddress,
    existingKey,
    force,
  });

  const wroteAddress = writeEnvVar(envPath, 'X402_MERCHANT_ADDRESS', address);
  const wroteKey =
    privateKey !== null &&
    writeEnvVar(envPath, 'X402_MERCHANT_PRIVATE_KEY', privateKey);
  console.log(
    reused
      ? `Reused merchant wallet ${address}`
      : `Created merchant wallet ${address}`,
  );
  if (wroteAddress) {
    console.log(`Wrote X402_MERCHANT_ADDRESS to ${envPath}`);
  }
  if (wroteKey) {
    console.log(`Wrote X402_MERCHANT_PRIVATE_KEY to ${envPath}`);
  }
  if (privateKey === null) {
    throw new Error(
      `No admin key available to write. Missing ${keyPath} and X402_MERCHANT_PRIVATE_KEY.`,
    );
  }
  console.log(`Admin key also stored at ${keyPath} (never printed).`);
  console.log(
    'Inbound x402 payTo does not need BNB. Fund + first execute only if you will spend from this wallet (that is when Keystore registration happens).',
  );
}

function writeFacilitator(
  path: string,
  current: string | undefined,
  force: boolean,
): void {
  if (!force && !isBlankEnvValue(current)) {
    if (current !== DEFAULT_X402_FACILITATOR_URL) {
      console.log(
        `Left ${path} X402_FACILITATOR_URL=${current} (pass --force to replace)`,
      );
    }
    return;
  }
  if (writeEnvVar(path, 'X402_FACILITATOR_URL', DEFAULT_X402_FACILITATOR_URL)) {
    console.log(`Wrote X402_FACILITATOR_URL=${DEFAULT_X402_FACILITATOR_URL} to ${path}`);
  }
}

async function provisionWallet(input: {
  chain: 'bnb' | 'bnb-testnet' | 'ethereum';
  keyPath: string;
  metaPath: string;
  existingAddress: string | undefined;
  existingKey: `0x${string}` | null;
  force: boolean;
}): Promise<{ address: string; privateKey: `0x${string}` | null; reused: boolean }> {
  const stored = readStoredKey(input.keyPath) ?? input.existingKey;

  if (
    !input.force &&
    !isBlankEnvValue(input.existingAddress) &&
    ADDRESS.test(input.existingAddress ?? '')
  ) {
    if (stored) {
      const derived = (await createWalletFromKey(input.chain, stored)).address;
      if (derived.toLowerCase() !== input.existingAddress!.toLowerCase()) {
        throw new Error(
          `X402_MERCHANT_ADDRESS=${input.existingAddress} does not match the stored admin key. Pass --force to replace.`,
        );
      }
      persistKeyFile(input.keyPath, stored);
      return { address: derived.toLowerCase(), privateKey: stored, reused: true };
    }
    return {
      address: input.existingAddress!.toLowerCase(),
      privateKey: null,
      reused: true,
    };
  }

  const privateKey = stored ?? generatePrivateKey();
  // Official guide: save the key before createWallet — the SDK cannot give it back.
  persistKeyFile(input.keyPath, privateKey);

  const { address, publicKey } = await createWalletFromKey(input.chain, privateKey);
  writeFileSync(
    input.metaPath,
    `${JSON.stringify(
      {
        address,
        chain: input.chain,
        publicKey,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );

  return { address, privateKey, reused: stored !== null };
}

async function createWalletFromKey(
  chain: 'bnb' | 'bnb-testnet' | 'ethereum',
  privateKey: `0x${string}`,
): Promise<{ address: string; publicKey: string }> {
  const sdk = await loadAltanaSdk();
  const signer = sdk.signerFromPrivateKey(privateKey);
  const network =
    chain === 'bnb-testnet'
      ? sdk.BNB_TESTNET
      : chain === 'ethereum'
        ? sdk.ETHEREUM
        : sdk.BNB;
  const client = sdk.createClient({ chains: [network] });

  try {
    const wallet = await client.createWallet({ signer });
    return { address: wallet.address.toLowerCase(), publicKey: signer.publicKey };
  } catch (error) {
    // Private-key wallets are the EIP-7702 EOA; the relay call is convenience, not the address.
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`createWallet relay call failed (${reason}); using signer address`);
    return { address: signer.address.toLowerCase(), publicKey: signer.publicKey };
  }
}

function persistKeyFile(path: string, privateKey: `0x${string}`): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${privateKey}\n`, { encoding: 'utf8', mode: 0o600 });
  chmodSync(path, 0o600);
}

function readStoredKey(path: string): `0x${string}` | null {
  if (!existsSync(path)) return null;
  return readStoredKeyValue(readFileSync(path, 'utf8'));
}

function readStoredKeyValue(value: string | undefined): `0x${string}` | null {
  const key = value?.trim();
  if (!key) return null;
  if (!PRIVATE_KEY.test(key)) {
    throw new Error('Admin key is not a 32-byte hex private key');
  }
  return key as `0x${string}`;
}

/**
 * Nest / ts-node CommonJS rewrites `import()` to `require()`, which cannot
 * load the ESM-only SDK. Evaluate import in a native function so Node keeps it.
 */
function loadAltanaSdk(): Promise<typeof import('@altananetwork/sdk')> {
  return new Function('return import("@altananetwork/sdk")')() as Promise<
    typeof import('@altananetwork/sdk')
  >;
}

void main();
