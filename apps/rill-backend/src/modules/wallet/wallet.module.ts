import { Module } from '@nestjs/common';

// TODO: The ONLY module permitted to touch Altana. It owns the client, signers, session grants
// and revocations; every other module requests wallet actions through its services and never
// constructs a signer or Session itself.
@Module({})
export class WalletModule {}
