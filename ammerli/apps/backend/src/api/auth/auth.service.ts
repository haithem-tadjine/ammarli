import { IEmailJob } from '@/common/interfaces/job.interface';
import { Uuid } from '@/common/types/common.type';
import { Branded } from '@/common/types/types';
import { AllConfigType } from '@/config/config.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorMessageConstants } from '@/constants/error-code.constant';
import { QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { ClientService } from '../client/client.service';
import { DriverService } from '../driver/driver.service';
import { SessionEntity } from '../user/entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import { UserRoleEnum } from '../user/enums/user-role.enum';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { JwtPayloadType } from './types/jwt-payload.type';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';
import { ResetDriverPasswordDto } from './dto/reset-driver-password.req.dto';
import { CheckClientPhoneDto } from './dto/check-client-phone.req.dto';
import { ResetClientPasswordDto } from './dto/reset-client-password.req.dto';
import { DriverEntity } from '../driver/entities/driver.entity';

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly clientService: ClientService,
    private readonly driverService: DriverService,
  ) { }

  async signIn(dto: LoginReqDto): Promise<LoginResDto> {
    const { phone, password } = dto;
    const whereCondition: any = { phone: dto.phone };
    if (dto.role) {
      whereCondition.role = dto.role;
    }

    const user = await this.userRepository.findOne({
      where: whereCondition,
    });

    const isPasswordValid =
      user && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        ErrorMessageConstants.AUTH.INVALID_CREDENTIALS,
      );
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });
    await session.save();

    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash,
    });

    return plainToInstance(LoginResDto, {
      userId: user.id,
      user,
      ...token,
    });
  }

  async register(
    dto: RegisterReqDto,
    manager?: EntityManager,
  ): Promise<RegisterResDto> {
    if (!manager) {
      return await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          return await this.register(dto, transactionalEntityManager);
        },
      );
    }

    const userRepo = manager.getRepository(UserEntity);

    if (dto.role === UserRoleEnum.CLIENT && dto.driverType) {
      throw new ValidationException(
        ErrorMessageConstants.AUTH.INVALID_ROLE_DATA,
      );
    }

    const isExistUser = await userRepo.exists({
      where: { phone: dto.phone, role: dto.role },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorMessageConstants.USER.PHONE_EXISTS);
    }

    const user = userRepo.create({
      phone: dto.phone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      role: dto.role,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    await user.hashPassword();
    await userRepo.save(user);

    if (dto.role === UserRoleEnum.CLIENT) {
      await this.clientService.createProfile(user, manager);
    } else if (dto.role === UserRoleEnum.DRIVER) {
      await this.driverService.createProfile(
        user,
        dto.driverType!,
        {
          truckPlate: dto.truckPlate,
          waterType: dto.waterType,
          capacity: dto.capacity,
          brands: dto.brands,
          bottledPrices: dto.bottledPrices,
        },
        manager,
      );
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });
    await manager.save(SessionEntity, session);

    const token = await this.createTokenWithUser(user, {
      id: user.id,
      sessionId: session.id,
      hash,
    });

    return plainToInstance(RegisterResDto, {
      userId: user.id,
      user,
      ...token,
    });
  }

  async logout(userToken: JwtPayloadType): Promise<void> {
    await this.cacheManager.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, userToken.sessionId),
      true,
      userToken.exp * 1000 - Date.now(),
    );
    await SessionEntity.delete(userToken.sessionId);
  }

  async refreshToken(dto: RefreshReqDto): Promise<RefreshResDto> {
    const { sessionId, hash } = await this.verifyRefreshToken(dto.refreshToken);
    const session = await SessionEntity.findOneBy({ id: sessionId });

    if (!session || session.hash !== hash) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findOneOrFail({
      where: { id: session.userId },
      select: ['id'],
    });

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    SessionEntity.update(session.id, { hash: newHash });

    return await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: newHash,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }

    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    const userExists = await this.userRepository.findOne({
      where: { id: payload.id as Uuid },
      select: ['id'],
    });

    if (!userExists) {
      throw new UnauthorizedException();
    }

    return payload;
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<JwtRefreshPayloadType> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async createToken(data: {
    id: string;
    sessionId: string;
    hash: string;
  }): Promise<Token> {
    const user = await this.userRepository.findOne({
      where: { id: data.id as Uuid },
    });
    return this.createTokenWithUser(user!, data);
  }

  private async createTokenWithUser(
    user: UserEntity,
    data: { id: string; sessionId: string; hash: string },
  ): Promise<Token> {
    let driverId: string | undefined;
    let clientId: string | undefined;

    if (user?.role === UserRoleEnum.DRIVER) {
      try {
        const driver = await this.driverService.findByUserId(user.id);
        driverId = driver.id;
      } catch (e) { }
    } else if (user?.role === UserRoleEnum.CLIENT) {
      try {
        const client = await this.clientService.findByUserId(user.id);
        clientId = client.id;
      } catch (e) { }
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          role: user?.role || '',
          sessionId: data.sessionId,
          ...(driverId && { driverId }),
          ...(clientId && { clientId }),
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: this.configService.getOrThrow<number>('auth.expires', {
            infer: true,
          }),
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow<number>(
            'auth.refreshExpires',
            {
              infer: true,
            },
          ),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    } as Token;
  }

  async verifyDriverPlate(dto: {
    phone: string;
    truckPlate: string;
  }): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone, role: UserRoleEnum.DRIVER },
    });
    if (!user) {
      throw new ValidationException('Driver account not found');
    }

    const driver = await DriverEntity.findOne({
      where: { user: { id: user.id } },
    });
    if (!driver || driver.truckPlate !== dto.truckPlate) {
      throw new ValidationException('Invalid truck plate number');
    }
  }

  async resetDriverPasswordWithPlate(
    dto: ResetDriverPasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone, role: UserRoleEnum.DRIVER },
    });
    if (!user) {
      throw new ValidationException('Driver account not found');
    }

    const driver = await DriverEntity.findOne({
      where: { user: { id: user.id } },
    });
    if (!driver || driver.truckPlate !== dto.truckPlate) {
      throw new ValidationException('Invalid truck plate number');
    }

    user.password = dto.newPassword;
    await this.userRepository.save(user);
  }

  async checkClientPhone(
    dto: CheckClientPhoneDto,
  ): Promise<{ exists: boolean }> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone, role: UserRoleEnum.CLIENT },
    });
    if (!user) {
      throw new ValidationException('رقم الهاتف غير مسجّل');
    }
    return { exists: true };
  }

  async resetClientPassword(dto: ResetClientPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone, role: UserRoleEnum.CLIENT },
    });
    if (!user) {
      throw new ValidationException('رقم الهاتف غير مسجّل');
    }
    user.password = dto.newPassword;
    await this.userRepository.save(user);
  }
}