import { NumberField } from '@/decorators/field.decorators';

export class RechargeWalletReqDto {
  @NumberField({
    isPositive: true,
    min: 10,
    swagger: true,
    example: 1000,
    description: 'Amount to recharge in DZD',
  })
  amount!: number;
}
