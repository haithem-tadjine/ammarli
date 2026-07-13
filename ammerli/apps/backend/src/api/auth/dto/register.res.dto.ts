import { UserEntity } from '@/api/user/entities/user.entity';
import { StringField } from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RegisterResDto {
  @Expose()
  @StringField()
  userId!: string;

  /**
   * JWT access token for immediate authentication after registration.
   */
  @Expose()
  @StringField()
  accessToken!: string;

  /**
   * Epoch timestamp when the access token will expire.
   */
  @Expose()
  @ApiProperty({ type: String, example: 1771192435 })
  tokenExpires!: number;

  @Expose()
  @ApiProperty({ type: UserEntity })
  user!: UserEntity;
}
