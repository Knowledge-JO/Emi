import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterListingDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  @MaxLength(40)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsIn([
    'swap',
    'loan',
    'risk',
    'liquidity',
    'token',
    'research',
    'orchestration',
    'other',
  ])
  category?:
    | 'swap'
    | 'loan'
    | 'risk'
    | 'liquidity'
    | 'token'
    | 'research'
    | 'orchestration'
    | 'other';

  @IsOptional()
  @IsBoolean()
  acceptsErc8183?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsX402?: boolean;

  @IsOptional()
  @IsBoolean()
  canSubcontract?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  skillId?: string;
}
