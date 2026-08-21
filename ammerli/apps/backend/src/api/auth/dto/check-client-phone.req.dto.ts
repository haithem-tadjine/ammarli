import { IsString } from 'class-validator';

export class CheckClientPhoneDto {
  @IsString()
  phone!: string;
}
