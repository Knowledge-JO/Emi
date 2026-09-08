import { IsOptional, IsString, MaxLength } from 'class-validator';

export class IssueAgentKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
