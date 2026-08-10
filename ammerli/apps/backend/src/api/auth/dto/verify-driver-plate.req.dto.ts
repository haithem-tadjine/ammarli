import { IsString } from 'class-validator';

export class VerifyDriverPlateDto {
  @IsString()
  phone!: string;

  @IsString()
  truckPlate!: string;
}
