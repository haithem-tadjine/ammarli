import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { ErrorMessageConstants } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { CreateManagerReqDto } from './dto/create-manager.req.dto';
import { ListUserReqDto } from './dto/list-user.req.dto';
import { LoadMoreUsersReqDto } from './dto/load-more-users.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserEntity } from './entities/user.entity';
import { RedisLibsService } from '@/libs/redis/redis-libs.service';
import { RedisConstants } from '@/constants/redis.constants';
import { ChangePasswordDto } from './dto/change-password.req.dto';
import { verifyPassword } from '@/utils/password.util';

/**
 * Service responsible for managing user-related business logic.
 * Handles user creation, profile updates, and various pagination strategies.
 *
 * @interface UserService
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly redisLibsService: RedisLibsService,
  ) {}

  /**
   * Creates a new user in the system.
   * Performs uniqueness checks and initializes system metadata.
   *
   * @param dto - Data transfer object containing user registration details
   * @returns The newly created user as a UserResDto
   * @throws {ValidationException} If the phone number is already registered
   *
   * @example
   * const user = await userService.create({ phone: '+1234567890', password: 'securePassword', ... });
   */
  async create(dto: CreateUserReqDto): Promise<UserResDto> {
    const { phone, password, bio, image } = dto;

    const user = await this.userRepository.findOne({
      where: [
        {
          phone,
        },
      ],
    });

    if (user) {
      throw new ValidationException(ErrorMessageConstants.USER.PHONE_EXISTS);
    }

    const newUser = new UserEntity({
      phone,
      password,
      bio,
      image,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
      ...dto,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.debug(savedUser);

    return plainToInstance(UserResDto, savedUser);
  }

  /**
   * Creates a new manager in the system (Wilaya Manager, Commune Manager, or Agent).
   */
  async createManager(dto: CreateManagerReqDto): Promise<UserResDto> {
    const { phone, password, role, managedWilaya, managedCommune, firstName, lastName } = dto;

    const user = await this.userRepository.findOne({
      where: [{ phone }],
    });

    if (user) {
      throw new ValidationException(ErrorMessageConstants.USER.PHONE_EXISTS);
    }

    const newUser = new UserEntity({
      phone,
      password,
      role,
      firstName,
      lastName,
      managedWilaya,
      managedCommune,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.debug(savedUser);

    return plainToInstance(UserResDto, savedUser);
  }

  /**
   * Retrieves a paginated list of users using offset-based pagination.
   *
   * @param reqDto - Pagination and filtering parameters
   * @returns An OffsetPaginatedDto containing the list of users and metadata
   *
   * @example
   * const { data, meta } = await userService.findAll({ page: 1, limit: 10 });
   */
  async findAll(
    reqDto: ListUserReqDto,
  ): Promise<OffsetPaginatedDto<UserResDto>> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (reqDto.role) {
      query.andWhere('user.role = :role', { role: reqDto.role });
    }
    const [users, metaDto] = await paginate<UserEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });
    return new OffsetPaginatedDto(plainToInstance(UserResDto, users), metaDto);
  }

  /**
   * Fetches users using cursor-based pagination for smooth "load more" functionality.
   *
   * @param reqDto - Cursor pagination parameters (limit, cursor)
   * @returns A CursorPaginatedDto containing users and pagination cursors
   *
   * @example
   * const results = await userService.loadMoreUsers({ limit: 20, afterCursor: '...' });
   */
  async loadMoreUsers(
    reqDto: LoadMoreUsersReqDto,
  ): Promise<CursorPaginatedDto<UserResDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    const paginator = buildPaginator({
      entity: UserEntity,
      alias: 'user',
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

    return new CursorPaginatedDto(plainToInstance(UserResDto, data), metaDto);
  }

  /**
   * Finds a single user by their unique identifier.
   *
   * @param id - The UUID of the user to find
   * @returns The user data transfer object
   * @throws {EntityNotFoundError} If the user does not exist
   * @throws {AssertionError} If the ID is not provided
   *
   * @example
   * const user = await userService.findOne('uuid-string');
   */
  async findOne(id: Uuid): Promise<UserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneByOrFail({ id });

    return user.toDto(UserResDto);
  }

  /**
   * Updates partial user profile information.
   *
   * @param id - UUID of the user to update
   * @param updateUserDto - Data to update (bio, image)
   * @throws {EntityNotFoundError} If the user is not found
   *
   * @example
   * await userService.update('uuid', { bio: 'New bio' });
   */
  async update(id: Uuid, dto: UpdateUserReqDto): Promise<void> {
    await this.userRepository.update({ id }, dto);
  }

  /**
   * Changes a user's password.
   *
   * @param id - The UUID of the user
   * @param dto - DTO with old and new passwords
   * @throws {ValidationException} If the user is not found or old password is incorrect
   */
  async changePassword(id: Uuid, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    assert(user, new ValidationException(ErrorMessageConstants.USER.NOT_FOUND));

    const isPasswordValid = await verifyPassword(dto.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new ValidationException(ErrorMessageConstants.AUTH.INVALID_CREDENTIALS);
    }

    user.password = dto.newPassword;
    // The @BeforeUpdate hook on UserEntity will hash the password
    await this.userRepository.save(user);
  }

  /**
   * Soft deletes a user from the system.
   *
   * @param id - UUID of the user to remove
   * @throws {EntityNotFoundError} If the user is not found
   *
   * @example
   * await userService.remove('uuid');
   */
  async remove(id: Uuid) {
    const user = await this.userRepository.findOneByOrFail({ id });
    await this.userRepository.softRemove(user);
  }

  /**
   * Get basic user statistics
   */
  async getUserStats() {
    const totalUsers = await this.userRepository.count();
    const customers = await this.userRepository.count({ where: { role: 'CLIENT' as any } });
    const drivers = await this.userRepository.count({ where: { role: 'DRIVER' as any } });

    let activeDrivers = 0;
    try {
      if (this.redisLibsService) {
        activeDrivers = await this.redisLibsService.zcard(RedisConstants.KEYS.DRIVERS_GEO_INDEX);
      }
    } catch (e) {
      this.logger.error(`Failed to get active drivers count: ${e.message}`);
    }

    return {
      totalUsers,
      customers,
      drivers,
      activeDrivers,
    };
  }
}
