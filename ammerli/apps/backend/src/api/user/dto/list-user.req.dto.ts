import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { UserRoleEnum } from '../enums/user-role.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request DTO for listing users with offset-based pagination.
 * Inherits standard page options (page, limit, order).
 */
export class ListUserReqDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: UserRoleEnum })
  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRoleEnum;
}
