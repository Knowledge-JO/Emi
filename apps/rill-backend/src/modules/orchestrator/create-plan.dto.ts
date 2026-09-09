import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PlanSelectionDto {
  @IsString()
  graphNodeId!: string;

  @IsUUID()
  agentId!: string;
}

export class CreatePlanDto {
  @IsUUID()
  intentId!: string;

  /** When omitted, rank 1 wins per graph node. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanSelectionDto)
  selections?: PlanSelectionDto[];
}
