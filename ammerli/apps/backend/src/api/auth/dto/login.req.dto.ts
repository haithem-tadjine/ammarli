import {
  EnumField,
  PasswordField,
  StringField,
} from '@/decorators/field.decorators';
import { Transform } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';
import { UserRoleEnum } from '../../user/enums/user-role.enum';

/**
 * Request payload for phone-based login.
 */
export class LoginReqDto {
  /**
   * User's registered phone number.
   * Accepts local (0XXXXXXXXX) or international (+213XXXXXXXXX) format.
   * @example "0596739462" or "+213596739462"
   */
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.startsWith('0')) {
      return '+213' + value.slice(1);
    }
    return value;
  })
  @IsPhoneNumber('DZ')
  @StringField()
  phone!: string;

  /**
   * Account password.
   */
  @PasswordField()
  password!: string;

  /**
   * User Role (CLIENT, DRIVER)
   */
  @EnumField(() => UserRoleEnum)
  role!: UserRoleEnum;
}
