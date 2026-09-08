import { Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Session private keys never go in Postgres. `secretRef` on the session row names an entry here.
 */
export abstract class SessionSecretStore {
  abstract put(ref: string, privateKey: string): Promise<void>;
  abstract get(ref: string): Promise<string | null>;
  abstract delete(ref: string): Promise<void>;
}

@Injectable()
export class MemorySessionSecretStore extends SessionSecretStore {
  private readonly keys = new Map<string, string>();

  async put(ref: string, privateKey: string): Promise<void> {
    this.keys.set(ref, privateKey);
  }

  async get(ref: string): Promise<string | null> {
    return this.keys.get(ref) ?? null;
  }

  async delete(ref: string): Promise<void> {
    this.keys.delete(ref);
  }
}

@Injectable()
export class FileSessionSecretStore extends SessionSecretStore {
  constructor(private readonly directory: string) {
    super();
  }

  async put(ref: string, privateKey: string): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const file = this.fileFor(ref);
    await writeFile(file, privateKey, { encoding: 'utf8', mode: 0o600 });
  }

  async get(ref: string): Promise<string | null> {
    try {
      const value = await readFile(this.fileFor(ref), 'utf8');
      const key = value.trim();
      return key.length > 0 ? key : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(ref: string): Promise<void> {
    try {
      await unlink(this.fileFor(ref));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private fileFor(ref: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(ref)) {
      throw new Error('Session secret ref must be a UUID');
    }
    return path.join(this.directory, ref);
  }
}
