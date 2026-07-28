import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { WalletTransactionEntity, WalletTransactionType } from './entities/wallet-transaction.entity';
import { UserRoleEnum } from '../user/enums/user-role.enum';
import { DriverEntity } from '../driver/entities/driver.entity';
import { DriverMetadataService } from '../driver/driver-metadata.service';
import { Uuid } from '@/common/types/common.type';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTxRepository: Repository<WalletTransactionEntity>,
    @Inject(forwardRef(() => DriverMetadataService))
    private readonly driverMetadataService: DriverMetadataService,
  ) {}

  async getMyBalance(userId: Uuid) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    return { walletBalance: user.walletBalance || 0, debt: user.debt || 0 };
  }

  async getUserForRecharge(phone: string) {
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '+213' + phone.slice(1);
    }
    const user = await this.userRepository.findOne({ where: { phone: formattedPhone } });
    if (!user) throw new BadRequestException('المستخدم غير موجود بهذا الرقم');
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      walletBalance: user.walletBalance || 0,
      debt: user.debt || 0,
    };
  }

  async recharge(senderId: Uuid, receiverId: Uuid, amount: number) {
    return this.userRepository.manager.transaction(async (manager: EntityManager) => {
      const sender = await manager.findOne(UserEntity, { where: { id: senderId } });
      const receiver = await manager.findOne(UserEntity, { where: { id: receiverId } });

      if (!sender) throw new BadRequestException('Sender not found');
      if (!receiver) throw new BadRequestException('Receiver not found');

      // Check hierarchy and balance
      if (sender.role !== UserRoleEnum.SUPER_ADMIN) {
        if (Number(sender.walletBalance) < amount) {
          throw new BadRequestException('Insufficient balance');
        }
        
        // Deduct from sender
        sender.walletBalance = Number(sender.walletBalance) - amount;
        await manager.save(UserEntity, sender);
      }

      // Add to receiver based on debt logic
      let remainingAmount = amount;
      const currentDebt = Number(receiver.debt) || 0;

      if (currentDebt > 0) {
        if (remainingAmount >= currentDebt) {
          remainingAmount -= currentDebt;
          receiver.debt = 0;
        } else {
          receiver.debt = currentDebt - remainingAmount;
          remainingAmount = 0;
        }
      }

      if (remainingAmount > 0) {
        receiver.walletBalance = Number(receiver.walletBalance || 0) + remainingAmount;
      }

      await manager.save(UserEntity, receiver);

      if (receiver.role === UserRoleEnum.DRIVER) {
        const driver = await manager.findOne(DriverEntity, { where: { user: { id: receiverId } } });
        if (driver) {
          let driverRemainingAmount = amount;
          const currentDriverDebt = Number(driver.appCommissionDebt) || 0;
          
          if (currentDriverDebt > 0) {
            if (driverRemainingAmount >= currentDriverDebt) {
              driverRemainingAmount -= currentDriverDebt;
              driver.appCommissionDebt = 0;
            } else {
              driver.appCommissionDebt = currentDriverDebt - driverRemainingAmount;
              driverRemainingAmount = 0;
            }
          }
          
          if (driverRemainingAmount > 0) {
            driver.walletBalance = Number(driver.walletBalance || 0) + driverRemainingAmount;
          }

          if (Number(driver.appCommissionDebt) < 2000) {
            driver.isSuspended = false;
          }
          await manager.save(DriverEntity, driver);
          
          if (!driver.isSuspended) {
            try {
              await this.driverMetadataService.setSuspensionStatus(driver.id, false);
            } catch(e) {
              console.error('Failed to sync suspension status to Redis:', e);
            }
          }
        }
      }

      // Record transaction
      const tx = manager.create(WalletTransactionEntity, {
        amount,
        senderId,
        receiverId,
        type: WalletTransactionType.RECHARGE,
        createdBy: senderId,
        updatedBy: senderId,
      });
      await manager.save(WalletTransactionEntity, tx);

      return { success: true, receiverBalance: receiver.walletBalance, receiverDebt: receiver.debt };
    });
  }
}
