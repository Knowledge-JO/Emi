import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { wallets } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';
import type { UserRecord } from '../users/users.service';
import type { RegisterPasskeyWalletDto } from './dto/register-passkey-wallet.dto';

export type WalletRecord = typeof wallets.$inferSelect;

/** What the API returns for a wallet. No key material exists to leak, by construction. */
export type WalletResponse = {
  id: string;
  address: string;
  signerKind: WalletRecord['signerKind'];
  chainIds: number[];
  /** The client needs both to rebuild the signer on a return visit without a fresh ceremony. */
  passkeyRpId: string | null;
  passkeyCredentialId: string | null;
  adminPublicKey: string | null;
  /** False until the first admin-signed action registers the key on-chain. */
  adminKeyRegistered: boolean;
  status: WalletRecord['status'];
  createdAt: string;
};

/**
 * Smart-account lifecycle. For passkey wallets the ceremony itself belongs to the browser — a
 * WebAuthn credential cannot be created anywhere else, and the point of the design is that the
 * key never leaves the user's device. So this service records what the browser provisioned and
 * owns everything server-side from then on: lookup, status, and later the execute path.
 *
 * The record is a claim until the chain confirms it. `adminKeyRegistered` stays false until the
 * first admin-signed execute lands, which is the moment the wallet becomes verifiable.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly events: EventStoreService,
    @Inject(ConfigService) private readonly config: RillConfigService,
  ) {}

  findForUser(userId: string): Promise<WalletRecord | undefined> {
    return this.db.query.wallets.findFirst({
      where: and(
        eq(wallets.ownerKind, 'user'),
        eq(wallets.ownerUserId, userId),
        eq(wallets.status, 'active'),
      ),
    });
  }

  findForAgent(agentId: string): Promise<WalletRecord | undefined> {
    return this.db.query.wallets.findFirst({
      where: and(
        eq(wallets.ownerKind, 'agent'),
        eq(wallets.ownerAgentId, agentId),
        eq(wallets.status, 'active'),
      ),
    });
  }

  /**
   * Record an agent's own Altana account. Distinct from the user grant: this wallet receives
   * escrow and pays capabilities. The admin key is not a passkey — custody stays with whoever
   * created the address (`external` = we only store the address).
   */
  async registerAgentWallet(input: {
    agentId: string;
    address: string;
    chainIds: number[];
    label?: string;
  }): Promise<{ wallet: WalletRecord; created: boolean }> {
    const address = input.address.toLowerCase();
    this.assertServedChains(input.chainIds);

    const existing = await this.findForAgent(input.agentId);
    if (existing) {
      if (existing.address !== address) {
        throw new ConflictException(
          `Agent already has wallet ${existing.address}`,
        );
      }
      return { wallet: existing, created: false };
    }

    const [inserted] = await this.db
      .insert(wallets)
      .values({
        address,
        ownerKind: 'agent',
        ownerAgentId: input.agentId,
        signerKind: 'external',
        label: input.label ?? null,
        chainIds: input.chainIds,
      })
      .onConflictDoNothing({ target: wallets.address })
      .returning();

    if (!inserted) {
      const owner = await this.db.query.wallets.findFirst({
        where: eq(wallets.address, address),
      });
      if (owner?.ownerAgentId === input.agentId) {
        return { wallet: owner, created: false };
      }
      throw new ConflictException('Wallet address is already registered');
    }

    await this.events.append({
      type: 'wallet.created',
      subjectType: 'wallet',
      subjectId: inserted.id,
      actorKind: 'agent',
      actorId: input.agentId,
      payload: {
        address,
        signerKind: 'external',
        chainIds: input.chainIds,
      },
    });

    return { wallet: inserted, created: true };
  }

  /**
   * Records a passkey wallet the browser just created. Idempotent for the same address, so a
   * client that loses the response — after a ceremony the user cannot repeat identically — can
   * safely retry.
   */
  async registerPasskeyWallet(
    user: UserRecord,
    input: RegisterPasskeyWalletDto,
  ): Promise<{ wallet: WalletRecord; created: boolean }> {
    const address = input.address.toLowerCase();

    this.assertServedChains(input.chainIds);
    this.assertKnownRelyingParty(input.rpId);

    const existing = await this.findForUser(user.id);
    if (existing) {
      if (existing.address !== address) {
        // Never quietly replace the first wallet: it may already hold funds.
        throw new ConflictException(
          `Account already has wallet ${existing.address}`,
        );
      }
      return { wallet: existing, created: false };
    }

    const [inserted] = await this.db
      .insert(wallets)
      .values({
        address,
        ownerKind: 'user',
        ownerUserId: user.id,
        signerKind: 'passkey',
        label: input.label ?? null,
        chainIds: input.chainIds,
        passkeyRpId: input.rpId,
        passkeyCredentialId: input.credentialId,
        adminPublicKey: input.adminPublicKey.toLowerCase(),
      })
      .onConflictDoNothing({ target: wallets.address })
      .returning();

    if (!inserted) {
      return {
        wallet: await this.resolveAddressConflict(address, user),
        created: false,
      };
    }

    this.logger.log(`Registered passkey wallet ${address} for user ${user.id}`);

    await this.events.append({
      type: 'wallet.created',
      subjectType: 'wallet',
      subjectId: inserted.id,
      actorKind: 'user',
      actorId: user.id,
      payload: {
        address,
        signerKind: 'passkey',
        chainIds: input.chainIds,
        rpId: input.rpId,
      },
    });

    return { wallet: inserted, created: true };
  }

  toResponse(wallet: WalletRecord): WalletResponse {
    return {
      id: wallet.id,
      address: wallet.address,
      signerKind: wallet.signerKind,
      chainIds: wallet.chainIds,
      passkeyRpId: wallet.passkeyRpId,
      passkeyCredentialId: wallet.passkeyCredentialId,
      adminPublicKey: wallet.adminPublicKey,
      adminKeyRegistered: wallet.adminKeyRegistered,
      status: wallet.status,
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  /**
   * A retry of the same registration and a claim on someone else's address arrive here looking
   * identical, so the owner decides which it was.
   */
  private async resolveAddressConflict(
    address: string,
    user: UserRecord,
  ): Promise<WalletRecord> {
    const owner = await this.db.query.wallets.findFirst({
      where: eq(wallets.address, address),
    });

    if (owner?.ownerUserId === user.id) return owner;

    this.logger.warn(
      `User ${user.id} tried to register wallet ${address}, which belongs to another account`,
    );
    throw new ConflictException('Wallet address is already registered');
  }

  private assertServedChains(chainIds: number[]): void {
    const served = this.config.get('altana.chainId', { infer: true });
    const unserved = chainIds.filter((chainId) => chainId !== served);

    if (unserved.length > 0) {
      throw new BadRequestException(
        `Wallet must be provisioned on chain ${served}, got ${unserved.join(', ')}`,
      );
    }
  }

  /**
   * A passkey only works on the origin it was created for, so an rpId outside the origins this
   * API serves is either a misconfigured client or a wallet this deployment can never sign with.
   */
  private assertKnownRelyingParty(rpId: string): void {
    const origins = this.config.get('app.webOrigins', { infer: true });
    const hosts = origins.map((origin) => new URL(origin).hostname);

    if (!hosts.includes(rpId)) {
      throw new BadRequestException(`Unknown passkey relying party: ${rpId}`);
    }
  }
}
