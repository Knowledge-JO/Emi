import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { keccak256 } from 'viem';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { authorizations, permissions, sessions } from '../../database/schema';
import type { GrantPermissions } from './permission.service';

export type PersistGrantInput = {
  id: string;
  walletId: string;
  grantedToAgentId: string | null;
  publicKey: string;
  serialized: Record<string, unknown>;
  secretProvider: (typeof sessions.$inferInsert)['secretProvider'];
  secretRef: string;
  expiry: number;
  registered: boolean;
  permissions: GrantPermissions;
  grantTxHash?: string;
  keystoreAddress: string;
};

/**
 * Persist the JSON-safe half of a session. The private key is already in the secret store
 * named by `secretRef` before this runs.
 */
@Injectable()
export class SessionStoreService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
  ) {}

  async persistGrant(input: PersistGrantInput) {
    const publicKey = input.publicKey.toLowerCase();
    const keyId = keccak256(publicKey as `0x${string}`);
    const chainId = this.config.get('altana.chainId', { infer: true });
    const expiresAt = new Date(input.expiry * 1000);

    const [session] = await this.db
      .insert(sessions)
      .values({
        id: input.id,
        walletId: input.walletId,
        grantedToAgentId: input.grantedToAgentId,
        sessionPublicKey: publicKey,
        keyId,
        chainId,
        serialized: input.serialized,
        secretProvider: input.secretProvider,
        secretRef: input.secretRef,
        expiresAt,
        registered: input.registered,
        status: 'active',
      })
      .returning();

    const permissionRows = [
      ...(input.permissions.calls ?? []).map((call) => ({
        sessionId: session.id,
        kind: 'call' as const,
        targetAddress: call.to,
        selector: call.signature ? [call.signature] : null,
        rawEntry: {
          to: call.to,
          ...(call.signature ? { signature: call.signature } : {}),
        },
      })),
      ...(input.permissions.spend ?? []).map((entry) => {
        const token =
          entry.token ?? '0x0000000000000000000000000000000000000000';
        return {
          sessionId: session.id,
          kind: 'spend' as const,
          tokenAddress: token,
          spendLimit: entry.limit,
          spendPeriod: entry.period,
          rawEntry: {
            limit: entry.limit,
            period: entry.period,
            ...(entry.token ? { token: entry.token } : {}),
          },
        };
      }),
    ];

    if (permissionRows.length > 0) {
      await this.db.insert(permissions).values(permissionRows);
    }

    const [authorization] = await this.db
      .insert(authorizations)
      .values({
        walletId: input.walletId,
        sessionId: session.id,
        sessionPublicKey: publicKey,
        keyId,
        chainId,
        keystoreAddress: input.keystoreAddress,
        permissionsSnapshot: {
          ...(input.permissions.calls
            ? { calls: input.permissions.calls }
            : {}),
          ...(input.permissions.spend
            ? { spend: input.permissions.spend }
            : {}),
        },
        expiry: input.expiry,
        expiresAt,
        grantTxHash: input.grantTxHash?.toLowerCase() ?? null,
        registered: input.registered,
      })
      .returning();

    return { session, authorization };
  }
}
