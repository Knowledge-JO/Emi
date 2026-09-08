import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class DeclareListingCapabilityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  taxonomyKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsObject()
  inputSchema!: Record<string, unknown>;

  @IsObject()
  outputSchema!: Record<string, unknown>;

  @IsIn(['per_job', 'per_request', 'subscription'])
  pricingModel!: 'per_job' | 'per_request' | 'subscription';

  @IsIn(['x402', 'erc8183'])
  settlementRail!: 'x402' | 'erc8183';

  @Matches(/^\d+$/, { message: 'unitPrice must be a base-unit integer string' })
  unitPrice!: string;

  @IsUUID()
  priceAssetId!: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  assetIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  protocolIds!: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  expectedDurationSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  x402ResourceUrl?: string;

  @IsOptional()
  @IsIn(['GET', 'POST'])
  x402Method?: string;
}
