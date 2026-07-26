import { UpdateUserReqDto } from '@/api/user/dto/update-user.req.dto';
import { EnumFieldOptional, NumberFieldOptional } from '@/decorators/field.decorators';
import { DriverTypeEnum } from '../enums/driver-type.enum';

export class UpdateDriverReqDto extends UpdateUserReqDto {
  @EnumFieldOptional(() => DriverTypeEnum, {
    description: 'Type of the driver',
  })
  type?: DriverTypeEnum;

  @NumberFieldOptional({
    description: 'Default price for fast accept feature',
  })
  defaultPrice?: number;
}
