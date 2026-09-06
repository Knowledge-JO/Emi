import { Controller } from '@nestjs/common';

// TODO: Wallet endpoints — create smart account, read balances, list sessions, revoke a session.
// Session revocation must be reachable in one call: it is the user's emergency stop.
@Controller('wallets')
export class WalletController {}
