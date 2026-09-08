/**
 * Cross-ecosystem hashing form: sorted keys, compact separators, non-ASCII as `\uXXXX`.
 * Same algorithm as `@altananetwork/sdk` / `@bnbagent/sdk` so a manifest we hash matches
 * one hashed by the seller SDK.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value)).replace(/[\u007f-\uffff]/g, (ch) => {
    return `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`canonicalJson: non-finite number ${value}`);
  }
  return value;
}
