import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { DriverResDto } from '@/api/driver/dto/driver.res.dto';
import { Uuid } from '@/common/types/common.type';
import {
  ClassField,
  EnumField,
  NumberField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { RequestStatusEnum } from '../enums/request-status.enum';
import { RequestTypeEnum } from '../enums/request-type.enum';
import { CreateRequestDto } from './create-request.dto';

/**
 * Complete response payload for a service request.
 * Contains both client-provided data and system-assigned state (id, status, driver).
 */
@Exclude()
export class RequestResDto extends CreateRequestDto {
  /**
   * Unique identifier for the request.
   * @example "uuid-v4-string"
   */
  @UUIDField()
  @Expose()
  id: Uuid;

  /**
   * Pickup latitude (inherited).
   */
  @NumberField()
  @Expose()
  declare pickupLat: number;

  /**
   * Pickup longitude (inherited).
   */
  @NumberField()
  @Expose()
  declare pickupLng: number;

  /**
   * Requested quantity (inherited).
   */
  @NumberField()
  @Expose()
  declare quantity: number;

  /**
   * Current lifecycle stage of the request.
   */
  @EnumField(() => RequestStatusEnum)
  @Expose()
  status: RequestStatusEnum;

  /**
   * Type of request (inherited).
   */
  @EnumField(() => RequestTypeEnum, {
    description: 'Type of the request',
  })
  @Expose()
  declare type: RequestTypeEnum;

  @Expose()
  declare deliveryAddress?: string;

  @Expose()
  declare tankerDetails?: Record<string, any>;

  @Expose()
  declare bottledItems?: Record<string, any>;

  @Expose()
  declare isScheduled?: boolean;

  @Expose()
  declare scheduledDate?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Scheduled Time' })
  declare scheduledTime?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Wilaya of the request' })
  wilaya?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Commune of the request' })
  commune?: string;

  @Expose()
  declare subtotal?: number;

  @Expose()
  declare deliveryFee?: number;

  @Expose()
  declare totalPrice?: number;

  @Expose()
  declare cancelReason?: string;

  /**
   * ISO string of when the request was created.
   */
  @Expose()
  createdAt?: string;

  /**
   * Profile of the client who made the request.
   */
  @ClassField(() => UserResDto)
  @Expose()
  user: UserResDto;

  /**
   * UUID of the user who made the request.
   */
  @UUIDField()
  @Expose()
  userId: Uuid;

  /**
   * UUID of the driver currently assigned to this request, if any.
   */
  @UUIDField({ nullable: true })
  @Expose()
  driverId: Uuid | null;

  /**
   * List of driver UUIDs who have explicitly refused this request.
   * @default []
   */
  @UUIDField({ each: true, nullable: true })
  @Expose()
  refusedDrivers?: Uuid[] = [];

  /**
   * Number of times this request has been dispatched.
   * @default 0
   */
  @NumberField({ nullable: true })
  @Expose()
  dispatchAttempts?: number = 0;

  /**
   * The driver ID to whom the request is currently offered.
   */
  @UUIDField({ nullable: true })
  @Expose()
  offeredDriverId?: Uuid | null;

  /**
   * Driver details if a driver has accepted the request.
   */
  @ClassField(() => DriverResDto, { nullable: true })
  @Expose()
  driver?: DriverResDto;

  @Expose()
  get displayVolume(): string | undefined {
    if (this.type === RequestTypeEnum.TANKER && this.tankerDetails?.volume) {
      return `${this.tankerDetails.volume} لتر`;
    }
    if (this.type === RequestTypeEnum.BOTTLED && this.bottledItems) {
      const items = Array.isArray(this.bottledItems) ? this.bottledItems : Object.values(this.bottledItems);
      const itemsCount = items.length;
      return itemsCount === 1 ? '1 منتج' : `${itemsCount} منتجات`;
    }
    return undefined;
  }
}
