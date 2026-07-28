import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { applyFiltersToQueryBuilder } from '@/utils/query-filter.util';

import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../user/entities/user.entity';
import { DriverResDto } from './dto/driver.res.dto';
import { ListDriverReqDto } from './dto/list-driver.req.dto';
import { LoadMoreDriversReqDto } from './dto/load-more-drivers.req.dto';
import { UpdateDriverReqDto } from './dto/update-driver.req.dto';
import { DriverEntity } from './entities/driver.entity';
import { DriverTypeEnum } from './enums/driver-type.enum';
import { forwardRef, Inject } from '@nestjs/common';
import { DriverMetadataService } from './driver-metadata.service';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(DriverEntity)
    private readonly driverRepository: Repository<DriverEntity>,
    @Inject(forwardRef(() => DriverMetadataService))
    private readonly driverMetadataService: DriverMetadataService,
  ) {}

  async createProfile(
    user: UserEntity,
    type: DriverTypeEnum,
    extras?: {
      truckPlate?: string;
      waterType?: string;
      capacity?: number;
      brands?: string[];
    },
    manager?: EntityManager,
  ): Promise<DriverEntity> {
    const repo = manager ? manager.getRepository(DriverEntity) : this.driverRepository;
    const driver = repo.create({
      user,
      type,
      truckPlate: extras?.truckPlate,
      waterType: extras?.waterType,
      capacity: extras?.capacity,
      inventory: extras?.brands ? { brands: extras.brands } : undefined,
    });
    return await repo.save(driver);
  }

  async findAll(
    reqDto: ListDriverReqDto,
  ): Promise<OffsetPaginatedDto<DriverResDto>> {
    const query = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .orderBy('driver.createdAt', 'DESC');

    applyFiltersToQueryBuilder(query, reqDto, {
      searchColumns: [
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
      ],
    });

    const [drivers, metaDto] = await paginate<DriverEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(DriverResDto, drivers),
      metaDto,
    );
  }

  async loadMoreDrivers(
    reqDto: LoadMoreDriversReqDto,
  ): Promise<CursorPaginatedDto<DriverResDto>> {
    const queryBuilder = this.driverRepository.createQueryBuilder('driver');
    const paginator = buildPaginator({
      entity: DriverEntity,
      alias: 'driver',
      paginationKeys: ['createdAt'],
      query: {
        limit: reqDto.limit,
        order: 'DESC',
        afterCursor: reqDto.afterCursor,
        beforeCursor: reqDto.beforeCursor,
      },
    });

    const { data, cursor } = await paginator.paginate(queryBuilder);

    const metaDto = new CursorPaginationDto(
      data.length,
      cursor.afterCursor,
      cursor.beforeCursor,
      reqDto,
    );

    return new CursorPaginatedDto(plainToInstance(DriverResDto, data), metaDto);
  }

  async findOne(id: Uuid): Promise<DriverResDto> {
    const driver = await this.driverRepository.findOneOrFail({ where: { id } });
    return driver.toDto(DriverResDto);
  }

  async findByUserId(userId: Uuid): Promise<DriverResDto> {
    const driver = await this.driverRepository.findOneOrFail({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    return driver.toDto(DriverResDto);
  }

  async getDashboard(userId: Uuid) {
    const driver = await this.driverRepository.findOneOrFail({
      where: { user: { id: userId } },
    });
    const driverId = driver.id;

    // Calculate today's earnings and jobs
    const statsResult = await this.driverRepository.manager.query(
      `SELECT SUM("totalPrice") as "todayEarnings", COUNT(id) as "todayJobs" FROM "requests" 
       WHERE "driverId" = $1 AND "status" = 'DELIVERED' AND "updated_at" >= CURRENT_DATE`,
      [driverId]
    );

    const todayEarnings = statsResult[0]?.todayEarnings ? parseFloat(statsResult[0].todayEarnings) : 0;
    const todayJobs = statsResult[0]?.todayJobs ? parseInt(statsResult[0].todayJobs) : 0;

    // Fetch today's completed requests
    const recentRequests = await this.driverRepository.manager.query(
      `SELECT * FROM "requests" 
       WHERE "driverId" = $1 AND "status" = 'DELIVERED' AND "updated_at" >= CURRENT_DATE 
       ORDER BY "updated_at" DESC LIMIT 10`,
      [driverId]
    );

    return {
      todayEarnings,
      todayJobs,
      walletBalance: driver.walletBalance,
      appCommissionDebt: driver.appCommissionDebt,
      isSuspended: driver.isSuspended,
      rating: driver.rating,
      recentRequests,
    };
  }

  async update(id: Uuid, updateDto: UpdateDriverReqDto) {
    const driver = await this.driverRepository.findOneOrFail({ where: { id } });

    Object.assign(driver, updateDto);
    driver.updatedBy = SYSTEM_USER_ID;

    await this.driverRepository.save(driver);
  }

  async rechargeWallet(driverId: Uuid, amount: number, processedById: Uuid) {
    const driver = await this.driverRepository.findOneOrFail({ where: { id: driverId }, relations: ['user'] });
    
    // Decrement debt
    let newDebt = Number(driver.appCommissionDebt || 0) - amount;
    let newWalletBalance = Number(driver.walletBalance || 0);

    if (newDebt < 0) {
      newWalletBalance += Math.abs(newDebt);
      newDebt = 0;
    }

    // If debt is below limit (e.g. 2000), unsuspend
    const isSuspended = newDebt >= 2000;

    await this.driverRepository.manager.query(
      `UPDATE "drivers" SET "app_commission_debt" = $1, "walletBalance" = $2, "is_suspended" = $3 WHERE "id" = $4`,
      [newDebt, newWalletBalance, isSuspended, driverId]
    );

    const { v4: uuidv4 } = require('uuid');
    await this.driverRepository.manager.query(
      `INSERT INTO "wallet_transactions" ("id", "receiver_id", "amount", "type", "sender_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [uuidv4(), driver.user?.id || driverId, amount, 'RECHARGE', processedById]
    );

    // Sync to redis
    try {
      if (this.driverMetadataService) {
        await this.driverMetadataService.setSuspensionStatus(driverId, isSuspended);
      }
    } catch(e) {
      console.error('Failed to sync suspension status to Redis:', e);
    }
    
    return {
      success: true,
      newDebt,
      isSuspended,
    };
  }

  async remove(id: Uuid) {
    await this.driverRepository.findOneOrFail({ where: { id } });
    await this.driverRepository.softDelete(id);
  }
}
