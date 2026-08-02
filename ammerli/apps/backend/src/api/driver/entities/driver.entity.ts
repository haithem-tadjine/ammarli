import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { dbEnumType } from '@/common/utils/db-types';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { DriverTypeEnum } from '../enums/driver-type.enum';

@Entity('drivers')
export class DriverEntity extends AbstractEntity {
  constructor(data?: Partial<DriverEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_driver_id' })
  id!: Uuid;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: UserEntity;

  @Column({
    type: dbEnumType,
    enum: DriverTypeEnum,
    default: DriverTypeEnum.BOTTLED,
  })
  type: DriverTypeEnum;

  @Column({ type: 'float', default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  totalJobs: number;

  @Column({ nullable: true })
  truckPlate: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ nullable: true })
  waterType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ name: 'app_commission_debt', type: 'decimal', precision: 10, scale: 2, default: 0 })
  appCommissionDebt: number;

  @Column({ name: 'is_suspended', type: 'boolean', default: false })
  isSuspended: boolean;

  @Column({ type: 'json', nullable: true })
  inventory: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultPrice?: number;

  // أسعار القوارير: فاردو 0.5L، فاردو 1.5L، قارورة 5L
  @Column({ name: 'bottled_prices', type: 'json', nullable: true })
  bottledPrices?: { '0.5L': number; '1.5L': number; '5L': number };
}
