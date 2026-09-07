import { relations } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { apiKeys } from './api-keys';
import { address, primaryId, timestamps, ts } from './common';
import { verificationStatus } from './enums';
import { users } from './users';

/**
 * Publishers of agents. `payoutAddress` is the destination for every revenue share owed to this
 * developer, so agent earnings are attributable without the platform holding funds.
 */
export const developers = pgTable(
  'developers',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    website: text('website'),
    contactEmail: text('contact_email'),
    payoutAddress: address('payout_address'),
    verification: verificationStatus('verification')
      .notNull()
      .default('unverified'),
    verifiedAt: ts('verified_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('developers_slug_key').on(t.slug),
    index('developers_user_idx').on(t.userId),
    index('developers_verification_idx').on(t.verification),
  ],
);

export const developersRelations = relations(developers, ({ one, many }) => ({
  user: one(users, { fields: [developers.userId], references: [users.id] }),
  agents: many(agents),
  apiKeys: many(apiKeys),
}));
