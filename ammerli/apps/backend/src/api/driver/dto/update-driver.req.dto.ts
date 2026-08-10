import { UpdateUserReqDto } from '@/api/user/dto/update-user.req.dto';
import { EnumFieldOptional, NumberFieldOptional } from '@/decorators/field.decorators';
import { DriverTypeEnum } from '../enums/driver-type.enum';

export class UpdateDriverReqDto extends UpdateUserReqDto {
  @EnumFieldOptional(() => DriverTypeEnum, {
    description: 'Type of the driver',
  })
  type?: DriverTypeEnum;

  @NumberFieldOptional({
    description: 'Default price per 20L bucket for spring tanker drivers (fast accept)',
  })
  defaultPrice?: number;

  // أسعار القوارير لسائقي المياه المعبأة (fast accept)
  bottledPrices?: { '0.5L': number; '1.5L': number; '5L': number };

  @NumberFieldOptional({
    description: 'Price per 1500L unit for well/construction tanker drivers (fast accept)',
  })
  pricePerUnit?: number;

  @NumberFieldOptional({
    description: 'Extra charge per floor for well/construction drivers',
  })
  floorPrice?: number;
}

