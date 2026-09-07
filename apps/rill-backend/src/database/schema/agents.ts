import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

import { agentIdentities } from './agent-identities';
import { apiKeys } from './api-keys';
import { EMBEDDING_DIMENSIONS, primaryId, timestamps } from './common';
import { capabilities } from './capabilities';
import { developers } from './developers';
import { agentCategory, agentStatus } from './enums';
import { jobs } from './jobs';
import { recommendations } from './recommendations';
import { reputation } from './reputation';
import { sessions } from './sessions';
import { wallets } from './wallets';
import { workflowSteps } from './workflow-steps';
import { x402Payments } from './x402-payments';

/**
 * Marketplace listings. An agent is an economic actor: it is discovered through its capabilities,
 * paid through one of the two rails, and acts only inside a session its hirer granted. The
 * listing carries no authority of its own — see `wallets` and `sessions` for that.
 */
export const agents = pgTable(
  'agents',
  {
    id: primaryId(),
    developerId: uuid('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: agentCategory('category').notNull().default('other'),
    version: text('version').notNull().default('0.1.0'),
    endpointUrl: text('endpoint_url'),
    status: agentStatus('status').notNull().default('draft'),
    /** Which rails this agent accepts as a worker. Capabilities narrow this per capability. */
    acceptsErc8183: boolean('accepts_erc8183').notNull().default(false),
    acceptsX402: boolean('accepts_x402').notNull().default(false),
    /** True for agents that may hire other agents, i.e. act as a hirer in `jobs`. */
    canSubcontract: boolean('can_subcontract').notNull().default(false),
    /** Semantic discovery vector over name + description + capability names. */
    descriptionEmbedding: vector('description_embedding', {
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('agents_slug_key').on(t.slug),
    index('agents_developer_idx').on(t.developerId),
    index('agents_status_category_idx').on(t.status, t.category),
    index('agents_embedding_idx').using(
      'hnsw',
      t.descriptionEmbedding.op('vector_cosine_ops'),
    ),
  ],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  developer: one(developers, {
    fields: [agents.developerId],
    references: [developers.id],
  }),
  identity: one(agentIdentities),
  wallet: one(wallets),
  capabilities: many(capabilities),
  recommendations: many(recommendations),
  workflowSteps: many(workflowSteps),
  sessions: many(sessions),
  reputation: many(reputation),
  apiKeys: many(apiKeys),
  jobsHired: many(jobs, { relationName: 'jobHirerAgent' }),
  jobsWorked: many(jobs, { relationName: 'jobWorkerAgent' }),
  paymentsMade: many(x402Payments, { relationName: 'x402Payer' }),
  paymentsReceived: many(x402Payments, { relationName: 'x402Payee' }),
}));
