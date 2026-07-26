import { Exclude, Expose } from 'class-transformer';

import { UserResDto } from '@/api/user/dto/user.res.dto';
import {
  ClassField,
  EnumField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { DriverTypeEnum } from '../enums/driver-type.enum';

@Exclude()
export class DriverResDto {
  @StringField()
  @Expose()
  id: string;

  @EnumField(() => DriverTypeEnum)
  @Expose()
  type: DriverTypeEnum;

  @ClassField(() => UserResDto)
  @Expose()
  user: UserResDto;

  @StringFieldOptional()
  @Expose()
  truckPlate: string;

  @StringFieldOptional()
  @Expose()
  waterType: string;

  @NumberFieldOptional()
  @Expose()
  capacity: number;

  @NumberFieldOptional()
  @Expose()
  rating: number;

  @Expose()
  inventory: Record<string, any>;

  @NumberFieldOptional()
  @Expose()
  defaultPrice?: number;
}
