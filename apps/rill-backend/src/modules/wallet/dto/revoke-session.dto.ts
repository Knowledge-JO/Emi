import { IsOptional, Matches } from 'class-validator';

/** What the browser reports after admin-signed `revokeSession`. */
export class RevokeSessionDto {
  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]{64}$/)
  revokeTxHash?: string;
}
