import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

import type { AuthorizationPlan } from '../../database/schema';

const evmAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase());

const spendPeriod = z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']);

export const grantPermissionsSchema = z.object({
  calls: z
    .array(
      z.object({
        to: evmAddress,
        signature: z.string().min(1).optional(),
      }),
    )
    .optional(),
  spend: z
    .array(
      z.object({
        token: evmAddress.optional(),
        limit: z.string().regex(/^\d+$/),
        period: spendPeriod,
      }),
    )
    .optional(),
});

export type GrantPermissions = z.infer<typeof grantPermissionsSchema>;

export type RecordedGrant = {
  walletAddress: string;
  publicKey: string;
  sessionPrivateKey: string;
  expiry: number;
  permissions: GrantPermissions;
  grantTxHash?: string;
  registered: boolean;
};

/**
 * Turn an authorization plan into session permissions, and refuse a grant that is wider than
 * the plan. The backend never talks to Altana; it only checks that what the browser granted
 * is inside the scope a human already reviewed.
 */
@Injectable()
export class PermissionService {
  parseGrantPermissions(raw: unknown): GrantPermissions {
    const parsed = grantPermissionsSchema.safeParse(raw);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_permissions_invalid',
        error: 'Granted permissions are not a valid session scope',
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }
    return parsed.data;
  }

  /**
   * Exact call-set match, spend limits at most the plan, expiry no later than the plan.
   * Empty calls with spend is unrestricted and always refused.
   */
  assertGrantMatchesPlan(
    plan: AuthorizationPlan,
    grant: GrantPermissions,
    expiry: number,
    nowSeconds: number = Math.floor(Date.now() / 1000),
  ): void {
    const grantedCalls = (grant.calls ?? []).map((call) => call.to);
    const planCalls = plan.calls.map((call) => call.to.toLowerCase());
    const grantedSpend = grant.spend ?? [];

    if (grantedCalls.length === 0 && grantedSpend.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'authorization_plan_empty_allowlist',
        error:
          'Refusing to record a session with no call allowlist — that would be unrestricted',
      });
    }

    if (grantedCalls.length === 0 && planCalls.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_calls_narrowed_to_empty',
        error: 'Grant omitted the contracts the plan allowlisted',
      });
    }

    const planCallSet = new Set(planCalls);
    for (const to of grantedCalls) {
      if (!planCallSet.has(to)) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'grant_calls_widen',
          error: `Grant allowlists ${to}, which is not on the plan`,
        });
      }
    }

    if (grantedCalls.length !== planCalls.length) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_calls_mismatch',
        error: 'Grant call allowlist must match the plan exactly',
      });
    }

    const planSpend = new Map(
      plan.spend.map((entry) => [entry.token.toLowerCase(), entry]),
    );
    const grantedTokens = new Set<string>();

    for (const entry of grantedSpend) {
      const token = (
        entry.token ?? '0x0000000000000000000000000000000000000000'
      ).toLowerCase();
      grantedTokens.add(token);
      const planned = planSpend.get(token);
      if (!planned) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'grant_spend_widen',
          error: `Grant spends ${token}, which is not on the plan`,
        });
      }
      if (entry.period !== planned.period) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'grant_spend_period_mismatch',
          error: `Spend period for ${token} must stay ${planned.period}`,
        });
      }
      if (BigInt(entry.limit) > BigInt(planned.limit)) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'grant_spend_widen',
          error: `Spend cap for ${token} exceeds the plan`,
        });
      }
    }

    if (grantedTokens.size !== planSpend.size) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_spend_mismatch',
        error: 'Grant spend tokens must match the plan exactly',
      });
    }

    if (expiry > plan.expiry) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_expiry_widen',
        error: 'Grant expiry is later than the plan allowed',
      });
    }

    if (expiry <= nowSeconds) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'grant_expired',
        error: 'Grant expiry is already in the past',
      });
    }
  }

  /**
   * Every execute target must already be on the granted call allowlist. An empty allowlist
   * with work to do would be unrestricted and is refused here, same as at grant.
   */
  assertCallsAllowed(allowlist: string[], calls: Array<{ to: string }>): void {
    if (calls.length === 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'execute_empty_calls',
        error: 'Execute requires at least one call',
      });
    }

    const allowed = allowlist.map((address) => address.toLowerCase());
    if (allowed.length === 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'authorization_plan_empty_allowlist',
        error:
          'Refusing to execute a session with no call allowlist — that would be unrestricted',
      });
    }

    const allowedSet = new Set(allowed);
    for (const call of calls) {
      const to = call.to.toLowerCase();
      if (!allowedSet.has(to)) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'execute_call_not_allowlisted',
          error: `${to} is not on the granted session allowlist`,
        });
      }
    }
  }
}
