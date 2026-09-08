import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  Matches,
  ValidateNested,
} from 'class-validator';

class GrantCallDto {
  @Matches(/^0x[0-9a-fA-F]{40}$/, { message: 'call.to must be an EVM address' })
  to!: string;

  @IsOptional()
  @Matches(/^.+$/)
  signature?: string;
}

class GrantSpendDto {
  @Matches(/^\d+$/, { message: 'spend.limit must be a decimal string' })
  limit!: string;

  @Matches(/^(minute|hour|day|week|month|year)$/)
  period!: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]{40}$/)
  token?: string;
}

class GrantPermissionsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantCallDto)
  calls?: GrantCallDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantSpendDto)
  spend?: GrantSpendDto[];
}

/**
 * What the browser reports after `grantSession`. The private key is written to the secret
 * store and never stored in Postgres. Scope is checked against the authorization plan before
 * anything is persisted.
 */
export class GrantPlanDto {
  @Matches(/^0x[0-9a-fA-F]{40}$/, {
    message: 'walletAddress must be a 20-byte hex address',
  })
  walletAddress!: string;

  @Matches(/^0x[0-9a-fA-F]{64,130}$/, {
    message: 'publicKey must be a hex public key',
  })
  publicKey!: string;

  @Matches(/^0x[0-9a-fA-F]{64}$/, {
    message: 'sessionPrivateKey must be a 32-byte hex key',
  })
  sessionPrivateKey!: string;

  @IsInt()
  @IsPositive()
  expiry!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => GrantPermissionsDto)
  permissions!: GrantPermissionsDto;

  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]{64}$/)
  grantTxHash?: string;

  @IsOptional()
  @IsBoolean()
  registered?: boolean;
}
