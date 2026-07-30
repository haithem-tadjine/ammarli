import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { UserRoleEnum } from '../../user/enums/user-role.enum';
import { MetricFilters } from '../interfaces/metric-provider.interface';
import { BaseMetricProvider } from './base-metric.provider';

export interface CommuneManagerReport {
  id: string;
  commune: string;
  managerName: string;
  phone: string;
  rechargedIn: number;
  rechargedOut: number;
  currentBalance: number;
}

/**
 * Provider for Commune Managers financial reports.
 */
@Injectable()
export class CommuneManagersMetricProvider extends BaseMetricProvider<CommuneManagerReport[]> {
  public readonly name = 'commune_managers';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super();
  }

  async compute(filters?: MetricFilters): Promise<CommuneManagerReport[]> {
    const query = this.userRepository
      .createQueryBuilder('manager')
      .where('manager.role = :role', { role: UserRoleEnum.COMMUNE_MANAGER })
      .andWhere('manager.deletedAt IS NULL');

    if (filters?.wilaya) {
      query.andWhere('manager.managedWilaya = :wilaya', { wilaya: filters.wilaya });
    }

    const managers = await query.getMany();
    
    if (managers.length === 0) {
      return [];
    }

    const managerIds = managers.map(m => m.id);

    // Sum of money recharged to the commune manager
    const incomingRechargesRaw = await this.userRepository.manager
      .createQueryBuilder('wallet_transactions', 'tx')
      .select('tx.receiver_id', 'managerId')
      .addSelect('SUM(tx.amount)', 'totalIn')
      .where('tx.receiver_id IN (:...managerIds)', { managerIds })
      .andWhere('tx.type = :type', { type: 'RECHARGE' })
      .groupBy('tx.receiver_id')
      .getRawMany();

    // Sum of money recharged by the commune manager to drivers
    const outgoingRechargesRaw = await this.userRepository.manager
      .createQueryBuilder('wallet_transactions', 'tx')
      .select('tx.sender_id', 'managerId')
      .addSelect('SUM(tx.amount)', 'totalOut')
      .where('tx.sender_id IN (:...managerIds)', { managerIds })
      .andWhere('tx.type = :type', { type: 'RECHARGE' })
      .groupBy('tx.sender_id')
      .getRawMany();

    const incomingMap = new Map(incomingRechargesRaw.map(r => [r.managerId, parseFloat(r.totalIn || '0')]));
    const outgoingMap = new Map(outgoingRechargesRaw.map(r => [r.managerId, parseFloat(r.totalOut || '0')]));

    return managers.map(manager => ({
      id: manager.id,
      commune: manager.managedCommune || 'غير محدد',
      managerName: `${manager.firstName} ${manager.lastName}`.trim(),
      phone: manager.phone,
      rechargedIn: incomingMap.get(manager.id) || 0,
      rechargedOut: outgoingMap.get(manager.id) || 0,
      currentBalance: typeof manager.walletBalance === 'string' ? parseFloat(manager.walletBalance) : (manager.walletBalance || 0),
    }));
  }
}
