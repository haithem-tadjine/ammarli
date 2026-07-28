import { StringField } from '@/decorators/field.decorators';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';
import { Uuid } from '@/common/types/common.type';

export class RechargeReqDto {
  @StringField()
  receiverId: Uuid;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000000, { message: 'المبلغ يجب أن يكون أقل من 10,000,000 دج' })
  amount: number;
}
