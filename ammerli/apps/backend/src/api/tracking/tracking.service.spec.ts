import { RedisConstants } from '@/constants/redis.constants';
import { RedisScriptService } from '@/libs/redis/redis-script.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisLibsService } from '@/libs/redis/redis-libs.service';
import { AppLogger } from 'src/logger/logger.service';
import { DriverMetadataCacheRepository } from './driver-metadata-cache.repository';
import { TrackingService } from './tracking.service';
import { DriverMetadataService } from '../driver/driver-metadata.service';

describe('TrackingService', () => {
  let service: TrackingService;
  let redisScriptService: jest.Mocked<RedisScriptService>;
  let driverMetadataCacheRepo: jest.Mocked<DriverMetadataCacheRepository>;
  let logger: jest.Mocked<AppLogger>;

  beforeEach(async () => {
    const redisScriptServiceMock = {
      eval: jest.fn(),
    };
    const driverMetadataCacheRepoMock = {
      isDriverOnline: jest.fn(),
    };
    const loggerMock = {
      setContext: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: RedisScriptService, useValue: redisScriptServiceMock },
        {
          provide: DriverMetadataCacheRepository,
          useValue: driverMetadataCacheRepoMock,
        },
        { provide: AppLogger, useValue: loggerMock },
        { provide: RedisLibsService, useValue: { geoAdd: jest.fn(), hset: jest.fn(), del: jest.fn(), zrem: jest.fn() } },
        { provide: DriverMetadataService, useValue: { updateMetadata: jest.fn(), getMetadata: jest.fn() } },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    redisScriptService = module.get(RedisScriptService);
    driverMetadataCacheRepo = module.get(DriverMetadataCacheRepository);
    logger = module.get(AppLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateDriverLocation', () => {
    const driverId = 'driver-1';
    const lat = 10.123;
    const lng = 20.456;

    it('should return true when script execution is successful (result 1)', async () => {
      redisScriptService.eval.mockResolvedValue(1);

      const result = await service.updateDriverLocation(driverId, lat, lng);

      expect(result).toBe(true);
      expect(redisScriptService.eval).toHaveBeenCalledWith(
        'UPDATE_DRIVER_LOCATION',
        [
          RedisConstants.KEYS.DRIVERS_GEO_INDEX,
          RedisConstants.KEYS.driverMetadata(driverId),
        ],
        expect.arrayContaining([
          lng,
          lat,
          driverId,
          expect.any(Number),
          RedisConstants.TTL.DRIVER_METADATA_SEC,
        ]),
      );
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should return false and log debug when update is stale (result 0)', async () => {
      redisScriptService.eval.mockResolvedValue(0);

      const result = await service.updateDriverLocation(driverId, lat, lng);

      expect(result).toBe(false);
    });

    it('should throw error and log on exception', async () => {
      const error = new Error('Redis down');
      redisScriptService.eval.mockRejectedValue(error);

      await expect(service.updateDriverLocation(driverId, lat, lng)).rejects.toThrow('Redis down');
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to update location for ${driverId}`,
        expect.any(String),
      );
    });
  });

  describe('isDriverOnline', () => {
    const driverId = 'driver-1';

    it('should return true when driver is online', async () => {
      driverMetadataCacheRepo.isDriverOnline.mockResolvedValue(true);

      const result = await service.isDriverOnline(driverId);

      expect(result).toBe(true);
      expect(driverMetadataCacheRepo.isDriverOnline).toHaveBeenCalledWith(
        driverId,
      );
    });

    it('should return false when driver is offline', async () => {
      driverMetadataCacheRepo.isDriverOnline.mockResolvedValue(false);

      const result = await service.isDriverOnline(driverId);

      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const error = new Error('Cache error');
      driverMetadataCacheRepo.isDriverOnline.mockRejectedValue(error);

      const result = await service.isDriverOnline(driverId);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check online status for driver ${driverId}`,
        error.stack,
      );
    });
  });
});
