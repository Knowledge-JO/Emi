import { Injectable } from '@nestjs/common';

// TODO: Smart-account lifecycle via client.createWallet / createPasskeyWallet, and the single
// execute path (client.execute) used by the execution layer.
// Remember: the first admin-signed execute auto-prepends Keystore initialRegisterKey — do not
// pre-call it — and the wallet must be funded with native tokens before that first execute.
// client.execute rejects an empty calls array.
@Injectable()
export class WalletService {}
