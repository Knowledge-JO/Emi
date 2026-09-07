import { z } from 'zod';

import type { JsonSchema } from '../ai/language-model';
import type { ParsedIntent } from '../../database/schema/intents';

const assetRefSchema = z.object({
  symbol: z.string().min(1),
  /** Display amount as the user said it, e.g. `"5"`. Null when the side is an output with no quote. */
  amount: z.string().min(1).nullable(),
});

const goalLeafSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1),
});

const goalChildSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1),
  children: z.array(goalLeafSchema),
});

export const parsedIntentSchema = z.object({
  kind: z.enum(['swap', 'lend', 'borrow', 'repay', 'protect', 'unknown']),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rejected: z.boolean(),
  rejectionReason: z.string().min(1).nullable(),
  chain: z.enum(['bnb', 'bnb-testnet', 'ethereum', 'unspecified']),
  legs: z.array(
    z.object({
      type: z.enum(['swap', 'lend', 'borrow', 'repay', 'monitor']),
      taxonomyKey: z.string().min(1),
      from: assetRefSchema,
      to: assetRefSchema,
    }),
  ),
  goalTree: z.object({
    id: z.string().min(1),
    goal: z.string().min(1),
    children: z.array(goalChildSchema),
  }),
  missing: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export type ParsedIntentObject = z.infer<typeof parsedIntentSchema>;

/** Compile-time check that the Zod object is the same shape we persist. */
const _parsedIntentAssigns: ParsedIntent = {} as ParsedIntentObject;
void _parsedIntentAssigns;

/**
 * JSON Schema sent to the model. Kept as a literal so Gemini/OpenAI/Anthropic see the same
 * contract; Zod above is what we actually trust after the call.
 */
export const parsedIntentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'kind',
    'summary',
    'confidence',
    'rejected',
    'rejectionReason',
    'chain',
    'legs',
    'goalTree',
    'missing',
    'assumptions',
  ],
  properties: {
    kind: {
      type: 'string',
      enum: ['swap', 'lend', 'borrow', 'repay', 'protect', 'unknown'],
      description:
        'Primary outcome. unknown if the message is not an actionable DeFi goal.',
    },
    summary: {
      type: 'string',
      description:
        'One-line restatement of the outcome, e.g. "Swap 5 USDT for BNB".',
    },
    confidence: {
      type: 'number',
      description: 'Model confidence in [0, 1].',
    },
    rejected: {
      type: 'boolean',
      description:
        'True when the message cannot be turned into an actionable intent.',
    },
    rejectionReason: {
      type: ['string', 'null'],
      description: 'Why it was rejected, or null.',
    },
    chain: {
      type: 'string',
      enum: ['bnb', 'bnb-testnet', 'ethereum', 'unspecified'],
      description:
        'bnb when the user mentions BNB/USDT/Pancake without another chain; unspecified if truly unknown.',
    },
    legs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'taxonomyKey', 'from', 'to'],
        properties: {
          type: {
            type: 'string',
            enum: ['swap', 'lend', 'borrow', 'repay', 'monitor'],
          },
          taxonomyKey: {
            type: 'string',
            description:
              'Machine key such as defi.swap, defi.lending.repay, defi.lending.protect.',
          },
          from: {
            type: 'object',
            additionalProperties: false,
            required: ['symbol', 'amount'],
            properties: {
              symbol: { type: 'string' },
              amount: {
                type: ['string', 'null'],
                description:
                  'Exact decimal string the user said. Never a number. Null if unknown.',
              },
            },
          },
          to: {
            type: 'object',
            additionalProperties: false,
            required: ['symbol', 'amount'],
            properties: {
              symbol: { type: 'string' },
              amount: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    goalTree: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'goal', 'children'],
      properties: {
        id: { type: 'string' },
        goal: { type: 'string' },
        children: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'goal', 'children'],
            properties: {
              id: { type: 'string' },
              goal: { type: 'string' },
              children: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'goal'],
                  properties: {
                    id: { type: 'string' },
                    goal: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    missing: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Facts still needed before this can execute, e.g. slippage, wallet.',
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Defaults you took, so a human can reject them.',
    },
  },
} satisfies JsonSchema;

export const INTENT_PARSER_SYSTEM = `You extract a structured intent from a user's message about on-chain activity.

Rules:
- Extract what must happen. Do not pick agents, protocols, routers, or wallet addresses.
- Amounts are decimal strings exactly as the user wrote them (e.g. "5"), never numbers, never base units.
- Symbols are uppercase (USDT, BNB, USDC).
- If the user says BNB, USDT, or Pancake without naming another chain, chain is "bnb".
- A swap "X for Y" means from.symbol=X with from.amount set, to.symbol=Y with to.amount null.
- taxonomyKey for a swap is "defi.swap".
- If the message is greeting, nonsense, or not an actionable financial outcome: kind="unknown", rejected=true, legs=[].
- Do not invent an amount the user did not state. Put the gap in missing[].
- Keep confidence honest. Guessing an asset drops confidence below 0.6 and goes in assumptions[].`;
