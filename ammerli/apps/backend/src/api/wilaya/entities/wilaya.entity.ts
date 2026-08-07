import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entity representing a Wilaya (province) in Algeria.
 * This is a standalone entity used by various modules (Pricing, Delivery, etc.)
 * to identify geographical locations.
 *
 * @class WilayaEntity
 * @extends AbstractEntity
 */
@Entity('wilayas')
export class WilayaEntity extends AbstractEntity {
  /**
   * Unique identifier for the Wilaya.
   */
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_wilaya_id' })
  id!: Uuid;

  /**
   * Official code of the Wilaya (e.g., "16" for Algiers, "31" for Oran).
   */
  @Column({ unique: true })
  @Index('UQ_wilaya_code', { unique: true })
  code!: string;

  /**
   * Name of the Wilaya.
   */
  @Column()
  name!: string;

  /**
   * Whether this Wilaya is active for service.
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * Whether drivers in this Wilaya are subject to the system-wide debt ceiling limit.
   */
  @Column({ name: 'is_debt_ceiling_enabled', default: true })
  isDebtCeilingEnabled: boolean;

  /**
   * List of specific communes in this Wilaya that are exempted from the debt ceiling.
   * Only applicable if the Wilaya itself is NOT fully exempted (i.e., isDebtCeilingEnabled = true).
   */
  @Column('jsonb', { name: 'exempted_communes', nullable: true, default: '[]' })
  exemptedCommunes: string[];
}
