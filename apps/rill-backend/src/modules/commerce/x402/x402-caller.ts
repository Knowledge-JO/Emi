export type X402Caller =
  | { kind: 'user'; userId: string }
  | { kind: 'agent'; agentId: string; slug: string };
