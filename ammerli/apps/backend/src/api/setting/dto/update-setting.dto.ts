import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingDto {
  @IsOptional()
  @IsNumber()
  bottledCommission?: number;

  @IsOptional()
  @IsNumber()
  tankerSpringCommission?: number;

  @IsOptional()
  @IsNumber()
  tankerWellCommission?: number;

  @IsOptional()
  @IsNumber()
  tankerWellVolumeUnit?: number;

  @IsOptional()
  @IsNumber()
  maxDebtAllowed?: number;

  @IsOptional()
  @IsBoolean()
  enableAutoSuspend?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;
}
