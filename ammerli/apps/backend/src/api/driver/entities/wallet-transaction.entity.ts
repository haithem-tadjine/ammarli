import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { DriverEntity } from './driver.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { dbEnumType } from '@/common/utils/db-types';

export enum TransactionTypeEnum {
  COMMISSION = 'COMMISSION',
  RECHARGE = 'RECHARGE',
}

@Entity('wallet_transactions')
export class WalletTransactionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: Uuid;

  @Column({ type: 'uuid' })
  driverId!: Uuid;

  @ManyToOne(() => DriverEntity)
  @JoinColumn({ name: 'driverId' })
  driver!: DriverEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: dbEnumType, enum: TransactionTypeEnum })
  type!: TransactionTypeEnum;

  // The admin or agent who performed the recharge (nullable for COMMISSION)
  @Column({ type: 'uuid', nullable: true })
  processedById?: Uuid;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'processedById' })
  processedBy?: UserEntity;

  // Reference to the request ID that caused the commission (nullable for RECHARGE)
  @Column({ type: 'uuid', nullable: true })
  requestId?: Uuid;
}
