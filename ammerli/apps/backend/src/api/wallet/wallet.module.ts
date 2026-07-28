import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { DriverModule } from '../driver/driver.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletTransactionEntity, UserEntity]),
    AuthModule,
    forwardRef(() => DriverModule),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
