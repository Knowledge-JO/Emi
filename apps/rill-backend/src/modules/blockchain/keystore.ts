import { keccak256, type Hex } from 'viem';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;

export function parseAddress(value: string): Hex | null {
  if (!ADDRESS_RE.test(value)) {
    return null;
  }
  return value.toLowerCase() as Hex;
}

export function parseKeyId(value: string): Hex | null {
  if (!BYTES32_RE.test(value)) {
    return null;
  }
  return value.toLowerCase() as Hex;
}

/** `keyId` is keccak256 of the SEC1 session public key, as stored on `sessions` / `authorizations`. */
export function keyIdFromPublicKey(publicKey: string): Hex | null {
  if (!/^0x[0-9a-fA-F]+$/.test(publicKey) || publicKey.length % 2 !== 0) {
    return null;
  }
  return keccak256(publicKey.toLowerCase() as Hex);
}
