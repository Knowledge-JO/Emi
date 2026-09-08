import {
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  workerSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  capabilityName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  task!: string;

  @IsOptional()
  @IsUUID()
  workflowStepId?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  deadlineSeconds?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
