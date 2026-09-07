import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  text!: string;
}
