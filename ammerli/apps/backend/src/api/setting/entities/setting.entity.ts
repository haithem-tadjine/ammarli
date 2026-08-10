import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 3 })
  bottledCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 3 })
  bottledCustomerMarkup: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.3 }) // legacy or default
  tankerSpringCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5 })
  tankerSpringCustomerMarkup: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  tankerWellCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  tankerWellCustomerMarkup: number;

  @Column({ type: 'int', default: 1500 })
  tankerWellVolumeUnit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 2000 })
  maxDebtAllowed: number;

  @Column({ type: 'boolean', default: true })
  enableAutoSuspend: boolean;

  @Column({ type: 'boolean', default: false })
  maintenanceMode: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
