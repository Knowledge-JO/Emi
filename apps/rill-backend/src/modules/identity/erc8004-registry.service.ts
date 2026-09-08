import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import {
  encodeRegisterCall,
  encodeSetAgentUriCall,
  type RegistryCall,
} from './erc8004-abi';
import {
  decodeAgentUri,
  encodeAgentUri,
  type Erc8004RegistrationFile,
} from './erc8004-codec';
import {
  ERC8004_CHAIN_READER,
  readErc8004Agent,
  type Erc8004ChainReader,
  type LiveRegistryRead,
} from './erc8004-read';

export type LiveIdentityRead = LiveRegistryRead & {
  decoded: ReturnType<typeof decodeAgentUri>;
};

/**
 * Live ERC-8004 registry. Reads are viem `eth_call`. Writes are encoded calldata for a later
 * selector-scoped session — this service never holds a signer and does not mint.
 */
@Injectable()
export class Erc8004RegistryService {
  constructor(
    @Inject(ConfigService) private readonly config: RillConfigService,
    @Inject(ERC8004_CHAIN_READER) private readonly reader: Erc8004ChainReader,
  ) {}

  registryAddress(): string {
    return this.config.get('erc8004.registryAddress', { infer: true });
  }

  chainId(): number {
    return this.config.get('altana.chainId', { infer: true });
  }

  async read(onchainAgentId: string): Promise<LiveIdentityRead> {
    let live: LiveRegistryRead;
    try {
      live = await readErc8004Agent(
        this.reader,
        this.registryAddress(),
        BigInt(onchainAgentId),
      );
    } catch {
      throw new UnprocessableEntityException({
        message: `ERC-8004 agent ${onchainAgentId} is not on ${this.registryAddress()}`,
        code: 'identity_not_on_chain',
      });
    }

    return { ...live, decoded: decodeAgentUri(live.uri) };
  }

  async readOrNull(onchainAgentId: string): Promise<LiveIdentityRead | null> {
    try {
      return await this.read(onchainAgentId);
    } catch {
      return null;
    }
  }

  buildRegisterCall(record: Erc8004RegistrationFile): RegistryCall {
    return encodeRegisterCall(this.registryAddress(), encodeAgentUri(record));
  }

  buildSetAgentUriCall(
    onchainAgentId: string,
    record: Erc8004RegistrationFile,
  ): RegistryCall {
    return encodeSetAgentUriCall(
      this.registryAddress(),
      BigInt(onchainAgentId),
      encodeAgentUri(record),
    );
  }
}
