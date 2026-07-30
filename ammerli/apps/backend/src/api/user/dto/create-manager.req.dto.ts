import { UserRoleEnum } from '@/api/user/enums/user-role.enum';
import {
  EnumField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Transform } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';

export class CreateManagerReqDto {
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.startsWith('0')) {
      return '+213' + value.slice(1);
    }
    return value;
  })
  @IsPhoneNumber()
  @StringField()
  phone!: string;

  @StringField()
  firstName!: string;

  @StringField()
  lastName!: string;

  @PasswordField()
  password!: string;

  @EnumField(() => UserRoleEnum)
  role!: UserRoleEnum;

  @StringFieldOptional()
  managedWilaya?: string;

  @StringFieldOptional()
  managedCommune?: string;
}
