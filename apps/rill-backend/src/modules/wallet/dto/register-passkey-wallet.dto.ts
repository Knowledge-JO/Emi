import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * What the browser reports after `createPasskeyWallet`. Every field here is a claim by the
 * client, not a fact: the wallet is counterfactual until its first admin-signed action, so there
 * is nothing on-chain to check it against yet. The service validates what it can — shape, chain,
 * relying party — and the chain becomes the source of truth at first execute.
 */
export class RegisterPasskeyWalletDto {
  /** The smart-account address, which for a passkey wallet is the upgraded throwaway EOA. */
  @Matches(/^0x[0-9a-fA-F]{40}$/, { message: 'address must be a 20-byte hex address' })
  address!: string;

  /** WebAuthn credential ID, base64url as the browser returns it — not hex. */
  @IsString()
  @MaxLength(1024)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'credentialId must be base64url',
  })
  credentialId!: string;

  /** Flat P256 public key (x || y), 64 bytes, no 0x04 prefix — the shape Porto's relay uses. */
  @Matches(/^0x[0-9a-fA-F]{128}$/, {
    message: 'adminPublicKey must be a flat 64-byte P256 key',
  })
  adminPublicKey!: string;

  /** Relying Party ID the passkey was created for. Must be a host this API serves. */
  @IsString()
  @MaxLength(253)
  rpId!: string;

  /** Chains the client provisioned the wallet on. Checked against the configured Altana chain. */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  chainIds!: number[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
