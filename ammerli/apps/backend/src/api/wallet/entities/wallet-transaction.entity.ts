import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum WalletTransactionType {
  RECHARGE = 'RECHARGE',
  COMMISSION = 'COMMISSION',
}

@Entity('wallet_transactions')
export class WalletTransactionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: Uuid;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'uuid', name: 'sender_id', nullable: true })
  senderId?: Uuid; // Who recharged (null if system)

  @Column({ type: 'uuid', name: 'receiver_id', nullable: true })
  receiverId: Uuid; // Who received

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
    default: WalletTransactionType.RECHARGE,
  })
  type: WalletTransactionType;
}
