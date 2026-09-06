import { Module } from '@nestjs/common';

// TODO: Agent commerce root. Composes two deliberately separate rails:
//   x402     — pay for a capability (small, fast, per-request, machine-to-machine)
//   ERC-8183 — hire an agent for a job (meaningful work with a deliverable, held in escrow)
// They must never share a code path, a settlement flow or a table. Never open an escrow job for a
// single API request.
@Module({})
export class CommerceModule {}
