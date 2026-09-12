import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from 'src/logger/logger.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisLibsService } from '@/libs/redis/redis-libs.service';

describe('UserService', () => {
  let service: UserService;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;

  beforeAll(async () => {
    userRepositoryValue = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        { provide: ConfigService, useValue: {} },
        { provide: AppLogger, useValue: { setContext: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: {} },
        { provide: RedisLibsService, useValue: { zcard: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
