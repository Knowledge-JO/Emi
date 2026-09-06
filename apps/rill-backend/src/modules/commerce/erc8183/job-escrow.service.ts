import { Injectable } from '@nestjs/common';

// TODO: Create and fund escrow jobs on the ERC-8183 contract, and mirror the on-chain state
// machine locally: created → funded → accepted → delivered → settled | disputed | cancelled.
// The hirer may be a user or another agent; funding is signed by that party's session, so the
// session's spend cap and contract allowlist must include the escrow contract.
@Injectable()
export class JobEscrowService {}
