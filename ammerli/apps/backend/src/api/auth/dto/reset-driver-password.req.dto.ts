import { IsString, MinLength } from 'class-validator';

export class ResetDriverPasswordDto {
  @IsString()
  phone!: string;

  @IsString()
  truckPlate!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
