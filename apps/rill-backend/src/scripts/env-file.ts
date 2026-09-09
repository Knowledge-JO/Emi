import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Same load order as seed: `.env.local` then `.env`, never overwriting process env. */
export function loadEnvFiles(cwd = process.cwd()): string[] {
  const loaded: string[] = [];
  for (const name of ['.env.local', '.env']) {
    const path = resolve(cwd, name);
    if (!existsSync(path)) continue;
    applyEnvFile(readFileSync(path, 'utf8'));
    loaded.push(path);
  }
  return loaded;
}

export function applyEnvFile(contents: string): void {
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = unquote(trimmed.slice(separator + 1).trim());
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function readEnvVar(contents: string, key: string): string | undefined {
  const match = contents.match(linePattern(key));
  if (!match) return undefined;
  return unquote(match[1].trim());
}

export function upsertEnvVar(
  contents: string,
  key: string,
  value: string,
): { text: string; changed: boolean } {
  const next = `${key}=${value}`;
  const pattern = linePattern(key);
  const match = contents.match(pattern);
  if (match) {
    if (match[0] === next) return { text: contents, changed: false };
    return { text: contents.replace(pattern, next), changed: true };
  }
  const suffix = contents.length === 0 || contents.endsWith('\n') ? '' : '\n';
  return { text: `${contents}${suffix}${next}\n`, changed: true };
}

export function writeEnvVar(path: string, key: string, value: string): boolean {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const { text, changed } = upsertEnvVar(current, key, value);
  if (changed) writeFileSync(path, text, 'utf8');
  return changed;
}

export function isBlankEnvValue(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function linePattern(key: string): RegExp {
  return new RegExp(`^${escapeRegExp(key)}=(.*)$`, 'm');
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
