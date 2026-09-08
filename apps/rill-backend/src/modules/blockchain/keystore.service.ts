import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import type { Hex } from 'viem';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { authorizations } from '../../database/schema';
import { CHAIN_PUBLIC_CLIENT, type ChainPublicClient } from './chain-client.provider';
import { KEYSTORE_ABI } from './keystore-abi';
import { parseAddress, parseKeyId } from './keystore';

export type KeyValidity = {
  user: Hex;
  keyId: Hex;
  valid: boolean;
  chainId: number;
  keystore: Hex;
  block: number;
};

/**
 * Independent on-chain verification of authority. `isValidKey` answers exists AND not revoked
 * AND not expired in one call. `getKeys` enumerates a wallet's keys — revoked ids are dropped,
 * expired ids are not, so every id must still pass `isValidKey` before it is trusted.
 */
@Injectable()
export class KeystoreService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
  ) {}

  keystoreAddress(): Hex {
    return this.config.get('altana.keyStore', { infer: true }) as Hex;
  }

  chainId(): number {
    return this.config.get('altana.chainId', { infer: true });
  }

  async isValidKey(user: string, keyId: string): Promise<KeyValidity> {
    const address = parseAddress(user);
    const id = parseKeyId(keyId);
    if (!address || !id) {
      throw new BadRequestException({
        code: 'invalid_keystore_query',
        message: 'user must be a 20-byte address and keyId a 32-byte hash',
      });
    }

    const keystore = this.keystoreAddress();
    const [valid, block] = await Promise.all([
      this.client.readContract({
        address: keystore,
        abi: KEYSTORE_ABI,
        functionName: 'isValidKey',
        args: [address, id],
      }),
      this.client.getBlockNumber(),
    ]);

    await this.persistValidity(id, Boolean(valid));

    return {
      user: address,
      keyId: id,
      valid: Boolean(valid),
      chainId: this.chainId(),
      keystore,
      block: Number(block),
    };
  }

  async getKeys(user: string): Promise<{
    user: Hex;
    keyIds: Hex[];
    chainId: number;
    keystore: Hex;
    block: number;
  }> {
    const address = parseAddress(user);
    if (!address) {
      throw new BadRequestException({
        code: 'invalid_keystore_query',
        message: 'user must be a 20-byte address',
      });
    }

    const keystore = this.keystoreAddress();
    const [ids, block] = await Promise.all([
      this.client.readContract({
        address: keystore,
        abi: KEYSTORE_ABI,
        functionName: 'getKeys',
        args: [address],
      }),
      this.client.getBlockNumber(),
    ]);

    return {
      user: address,
      keyIds: ids.map((id) => id.toLowerCase() as Hex),
      chainId: this.chainId(),
      keystore,
      block: Number(block),
    };
  }

  private async persistValidity(keyId: Hex, valid: boolean): Promise<void> {
    await this.db
      .update(authorizations)
      .set({
        onchainValid: valid,
        lastVerifiedAt: new Date(),
      })
      .where(
        and(
          eq(authorizations.keyId, keyId),
          eq(authorizations.chainId, this.chainId()),
        ),
      );
  }
}
