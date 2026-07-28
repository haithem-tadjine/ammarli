import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RechargeReqDto } from './dto/recharge.req.dto';
import { AuthGuard } from '@/guards/auth.guard';
import { UserRoleEnum } from '../user/enums/user-role.enum';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { Uuid } from '@/common/types/common.type';

@Controller({ path: 'wallet', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-balance')
  async getMyBalance(@CurrentUser() user: JwtPayloadType) {
    return this.walletService.getMyBalance(user.id as Uuid);
  }

  @Get('user/:phone')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.WILAYA_MANAGER, UserRoleEnum.COMMUNE_MANAGER, UserRoleEnum.AGENT)
  async getUserForRecharge(@Param('phone') phone: string) {
    return this.walletService.getUserForRecharge(phone);
  }

  @Post('recharge')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.WILAYA_MANAGER, UserRoleEnum.COMMUNE_MANAGER, UserRoleEnum.AGENT)
  async recharge(
    @CurrentUser() user: JwtPayloadType,
    @Body() dto: RechargeReqDto,
  ) {
    return this.walletService.recharge(user.id as Uuid, dto.receiverId, dto.amount);
  }
}
