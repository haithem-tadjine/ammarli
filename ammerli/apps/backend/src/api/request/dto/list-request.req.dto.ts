import { FilterDto } from '@/common/dto/filter.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RequestStatusEnum } from '../enums/request-status.enum';

export class ListRequestReqDto extends FilterDto {
  @ApiPropertyOptional({ enum: RequestStatusEnum })
  @IsOptional()
  @IsEnum(RequestStatusEnum)
  status?: RequestStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isScheduled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}
