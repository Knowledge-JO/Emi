import {
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class DeliverJobDto {
  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  storageUri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contentType?: string;
}
