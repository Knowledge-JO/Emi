import { Injectable } from '@nestjs/common';

// TODO: Grant, restore and revoke Altana sessions.
// grantSession commits permissions + expiry on-chain and charges the Keystore registration fee;
// record the returned transactionHash as a grant receipt, not as part of the session.
// revokeSession pulls authority in one userOp, effective immediately and monotonically — to
// restore access, grant a fresh session.
@Injectable()
export class SessionService {}
