import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class FundJobDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class ConfirmOnchainDto {
  @IsString()
  @Matches(/^\d+$/)
  onchainJobId!: string;

  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]{64}$/)
  txHash?: string;
}

export class ExecuteJobDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
