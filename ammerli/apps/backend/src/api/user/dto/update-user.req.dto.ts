import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserReqDto } from './create-user.req.dto';

export class UpdateUserReqDto extends PartialType(
  OmitType(CreateUserReqDto, ['username', 'password'] as const)
) {}
