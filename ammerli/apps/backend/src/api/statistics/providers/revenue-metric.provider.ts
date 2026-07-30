import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrderEntity,
  OrderStatusEnum,
} from '../../order/entities/order.entity';
import { ProductEntity } from '../../product/entities/product.entity';
import { RequestEntity } from '../../request/entities/request.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { UserRoleEnum } from '../../user/enums/user-role.enum';
import { MetricFilters } from '../interfaces/metric-provider.interface';
import { BaseMetricProvider } from './base-metric.provider';

export interface RevenueStats {
  totalCash: number;
  totalPlatformProfit: number;
  averageOrderValue: number;
  trend: { date: string; amount: number }[];
  rechargeByWilaya: { wilaya: string; amount: number }[];
}

/**
 * Provider for Revenue-related statistics.
 * Computes revenue by joining Orders, Requests, and Products.
 */
@Injectable()
export class RevenueMetricProvider extends BaseMetricProvider<RevenueStats> {
  public readonly name = 'revenue';

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {
    super();
  }

  /**
   * Computes revenue statistics based on delivered orders and wallet transactions.
   */
  async compute(filters?: MetricFilters): Promise<RevenueStats> {
    const baseQuery = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin(RequestEntity, 'request', 'request.id = order.requestId')
      .innerJoin(ProductEntity, 'product', 'product.id = request.productId')
      .where('order.status = :status', { status: OrderStatusEnum.DELIVERED });

    this.applyDateFilters(baseQuery, filters, 'order');

    const summary = await baseQuery
      .select('SUM(product.base_price * request.volume)', 'total')
      .addSelect('AVG(product.base_price * request.volume)', 'avg')
      .getRawOne();

    const trendUnit = this.getTruncUnit(filters?.granularity);
    const trend = await baseQuery
      .select(`DATE_TRUNC('${trendUnit}', order.created_at)`, 'date')
      .addSelect('SUM(product.base_price * request.volume)', 'amount')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const commissionQuery = this.orderRepository.manager.createQueryBuilder('wallet_transactions', 'tx')
      .where('tx.type = :type', { type: 'COMMISSION' });

    const rechargeQuery = this.orderRepository.manager.createQueryBuilder('wallet_transactions', 'tx')
      .innerJoin(UserEntity, 'receiver', 'receiver.id = tx.receiver_id')
      .leftJoin(UserEntity, 'sender', 'sender.id = tx.sender_id')
      .where('tx.type = :type', { type: 'RECHARGE' })
      .andWhere('receiver.role = :driverRole', { driverRole: UserRoleEnum.DRIVER });

    if (filters?.startDate) {
      commissionQuery.andWhere('tx.created_at >= :startDate', { startDate: filters.startDate });
      rechargeQuery.andWhere('tx.created_at >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      commissionQuery.andWhere('tx.created_at <= :endDate', { endDate: filters.endDate });
      rechargeQuery.andWhere('tx.created_at <= :endDate', { endDate: filters.endDate });
    }

    const commissionResult = await commissionQuery
      .select('SUM(tx.amount)', 'totalProfit')
      .getRawOne();

    const rechargeResult = await rechargeQuery
      .select('SUM(tx.amount)', 'totalCash')
      .getRawOne();

    const wilayaBreakdownRaw = await rechargeQuery
      .select('COALESCE(sender.managedWilaya, \'الإدارة العامة\')', 'wilaya')
      .addSelect('SUM(tx.amount)', 'amount')
      .groupBy('sender.managedWilaya')
      .getRawMany();

    return {
      totalCash: parseFloat(rechargeResult.totalCash || '0'),
      totalPlatformProfit: parseFloat(commissionResult.totalProfit || '0'),
      averageOrderValue: parseFloat(summary.avg || '0'),
      trend: trend.map((t) => ({
        date: t.date,
        amount: parseFloat(t.amount || '0'),
      })),
      rechargeByWilaya: wilayaBreakdownRaw.map((w) => ({
        wilaya: w.wilaya,
        amount: parseFloat(w.amount || '0'),
      })),
    };
  }
}
