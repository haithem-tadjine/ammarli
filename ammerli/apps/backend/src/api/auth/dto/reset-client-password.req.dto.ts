import { IsString, MinLength } from 'class-validator';

export class ResetClientPasswordDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
