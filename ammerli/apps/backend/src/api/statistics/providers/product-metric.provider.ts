import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrderEntity,
  OrderStatusEnum,
} from '../../order/entities/order.entity';
import { RequestEntity } from '../../request/entities/request.entity';
import { MetricFilters } from '../interfaces/metric-provider.interface';
import { BaseMetricProvider } from './base-metric.provider';

export interface ProductStats {
  springLiters: number;
  wellTrips: number;
  bottledFardeaus: number;
}

@Injectable()
export class ProductMetricProvider extends BaseMetricProvider<ProductStats> {
  public readonly name = 'products';

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {
    super();
  }

  async compute(filters?: MetricFilters): Promise<ProductStats> {
    const baseQuery = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin(RequestEntity, 'request', 'request.id = order.requestId')
      .where('order.status = :status', { status: OrderStatusEnum.DELIVERED })
      .andWhere('request.isReviewOrder = false');

    this.applyDateFilters(baseQuery, filters, 'order');

    const rows = await baseQuery
      .select([
        'request.type',
        'request.volume',
        'request.tankerDetails',
        'request.bottledItems',
      ])
      .getRawMany();

    let springLiters = 0;
    let wellTrips = 0;
    let bottledFardeaus = 0;

    for (const row of rows) {
      if (row.request_type === 'TANKER') {
        const tankerDetails = row.request_tankerDetails;
        if (tankerDetails && tankerDetails.waterType === 'Spring') {
          springLiters += Number(row.request_volume || tankerDetails.volume || 0);
        } else if (tankerDetails && tankerDetails.waterType === 'Well') {
          wellTrips += 1;
        }
      } else if (row.request_type === 'BOTTLED') {
        const bottledItems = row.request_bottledItems;
        if (Array.isArray(bottledItems)) {
          for (const item of bottledItems) {
            bottledFardeaus += Number(item.quantity || 0);
          }
        }
      }
    }

    return {
      springLiters,
      wellTrips,
      bottledFardeaus,
    };
  }
}
