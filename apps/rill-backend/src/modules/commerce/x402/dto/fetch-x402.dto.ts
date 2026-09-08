import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class FetchX402Dto {
  @Matches(/^https?:\/\/.+/i, { message: 'url must be an http(s) resource' })
  url!: string;

  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  @Type(() => Object)
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  body?: string;
}
