import { DriverTypeEnum } from '@/api/driver/enums/driver-type.enum';
import { UserRoleEnum } from '@/api/user/enums/user-role.enum';
import {
  EnumField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';

/**
 * Request payload for user registration.
 * Supports both Client and Driver registration with conditional validation.
 */
export class RegisterReqDto {
  /**
   * User's mobile phone number.
   * Accepts local Algerian format (0XXXXXXXXX) or international (+213XXXXXXXXX).
   * Automatically normalized to E.164 format.
   * @example "0596739462" or "+213596739462"
   */
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.startsWith('0')) {
      return '+213' + value.slice(1);
    }
    return value;
  })
  @IsPhoneNumber()
  @StringField()
  phone!: string;

  /**
   * User's first name.
   * @example "John"
   */
  @StringField()
  firstName!: string;

  /**
   * User's last name.
   * @example "Doe"
   */
  @StringField()
  lastName!: string;

  /**
   * Account password.
   */
  @PasswordField()
  password!: string;

  /**
   * Functional role assigned to the user.
   * @default UserRoleEnum.CLIENT
   */
  @EnumField(() => UserRoleEnum, { default: UserRoleEnum.CLIENT })
  role?: UserRoleEnum;

  /**
   * Type of driver profile (Wholesale, Retail, etc.).
   * Required ONLY if the role is set to DRIVER.
   */
  @EnumField(() => DriverTypeEnum, { required: false })
  @ValidateIf((o) => o.role === UserRoleEnum.DRIVER)
  @IsNotEmpty({ message: 'Driver type is required when role is DRIVER' })
  driverType?: DriverTypeEnum;

  /** License plate number (drivers only) */
  @StringFieldOptional()
  truckPlate?: string;

  /** Water type the driver delivers (tanker drivers only) */
  @StringFieldOptional()
  waterType?: string;

  /** Tank capacity in liters (tanker drivers only) */
  @IsOptional()
  capacity?: number;

  /** List of water brands (bottled drivers only) */
  @IsOptional()
  @IsArray()
  brands?: string[];

  /** Bottled water prices (bottled drivers only) */
  @IsOptional()
  @IsObject()
  bottledPrices?: { '0.5L': number; '1.5L': number; '5L': number };
}
