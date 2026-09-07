import { relations, sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, uuid } from 'drizzle-orm/pg-core';

import { address, baseUnits, primaryId, timestamps } from './common';
import { permissionKind, spendPeriod } from './enums';
import { sessions } from './sessions';

/**
 * The exact scope committed at grant time, one row per entry: a `call` row is one contract in the
 * allowlist, a `spend` row is one cap. Amounts are decimal strings so the bigint survives the
 * round trip — execute-time validation needs a byte-exact match with the on-chain authorization.
 *
 * An empty set of `call` rows is not "no access", it is *unrestricted* access: omitting
 * `permissions.calls` in the SDK lets a session reach any contract inside its spend cap. The
 * wallet module must therefore refuse to grant a session that has no `call` rows.
 */
export const permissions = pgTable(
  'permissions',
  {
    id: primaryId(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    kind: permissionKind('kind').notNull(),
    /** `call`: the allowed contract. */
    targetAddress: address('target_address'),
    /** `call`: optional 4-byte selector, narrowing the allowlist to specific functions. */
    selector: jsonb('selector').$type<string[]>(),
    /** `spend`: the token the cap applies to. */
    tokenAddress: address('token_address'),
    spendLimit: baseUnits('spend_limit'),
    spendPeriod: spendPeriod('spend_period'),
    /** The entry as handed to `grantSession`, verbatim. The bytes on-chain are these bytes. */
    rawEntry: jsonb('raw_entry').$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (t) => [
    index('permissions_session_idx').on(t.sessionId, t.kind),
    check(
      'permissions_call_shape',
      sql`${t.kind} <> 'call' or ${t.targetAddress} is not null`,
    ),
    check(
      'permissions_spend_shape',
      sql`${t.kind} <> 'spend'
        or (${t.tokenAddress} is not null and ${t.spendLimit} is not null and ${t.spendPeriod} is not null)`,
    ),
    check(
      'permissions_addresses_lowercase',
      sql`(${t.targetAddress} is null or ${t.targetAddress} = lower(${t.targetAddress}))
        and (${t.tokenAddress} is null or ${t.tokenAddress} = lower(${t.tokenAddress}))`,
    ),
  ],
);

export const permissionsRelations = relations(permissions, ({ one }) => ({
  session: one(sessions, {
    fields: [permissions.sessionId],
    references: [sessions.id],
  }),
}));
