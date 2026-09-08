import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AttachListingIdentityDto {
  @Matches(/^\d+$/, { message: 'onchainAgentId must be a decimal token id' })
  onchainAgentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  agentDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endpointUrl?: string;
}
