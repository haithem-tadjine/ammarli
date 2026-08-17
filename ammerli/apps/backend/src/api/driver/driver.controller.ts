import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { DriverResDto } from './dto/driver.res.dto';
import { ListDriverReqDto } from './dto/list-driver.req.dto';
import { LoadMoreDriversReqDto } from './dto/load-more-drivers.req.dto';
import { UpdateDriverReqDto } from './dto/update-driver.req.dto';
import { RechargeWalletReqDto } from './dto/recharge-wallet.req.dto';

import { TrackingService } from '../tracking/tracking.service';
import { RequestService } from '../request/request.service';

@ApiTags('drivers')
@Controller({
  path: 'drivers',
  version: '1',
})
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,
    @Inject(forwardRef(() => RequestService))
    private readonly requestService: RequestService,
  ) {}

  @Get()
  @ApiPublic()
  @ApiAuth({
    type: DriverResDto,
    summary: 'List Drivers',
    isPaginated: true,
  })
  async findAllDrivers(
    @Query() reqDto: ListDriverReqDto,
  ): Promise<OffsetPaginatedDto<DriverResDto>> {
    return await this.driverService.findAll(reqDto);
  }

  @Get('me')
  @ApiAuth({
    type: DriverResDto,
    summary: 'Get current authenticated driver profile',
  })
  async getMyProfile(@CurrentUser() user: any): Promise<DriverResDto> {
    return await this.driverService.findByUserId(user.id);
  }

  @Patch('me')
  @ApiAuth({
    type: DriverResDto,
    summary: 'Update current authenticated driver profile',
  })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() reqDto: UpdateDriverReqDto,
  ) {
    const driver = await this.driverService.findByUserId(user.id);
    return this.driverService.update(driver.id as Uuid, reqDto);
  }

  @Get('dashboard')
  @ApiAuth({
    summary: 'Get driver dashboard and daily summary',
  })
  async getDashboard(@CurrentUser() user: any) {
    return await this.driverService.getDashboard(user.id);
  }

  @Get('me/active-order')
  @ApiAuth({
    summary: 'Get the currently active order for the authenticated driver',
  })
  async getMyActiveOrder(@CurrentUser() user: any) {
    const driver = await this.driverService.findByUserId(user.id);
    return this.requestService.findActiveRequestForDriver(driver.id as string);
  }


  @Get('nearby')
  @ApiPublic() // Or ApiAuth, but public is easier for now. Let's stick to Public for 'Uber-like' feel before login? No, dashboard requires login.
  // Actually, dashboard is protected.
  @ApiAuth({
    summary: 'Find nearby drivers',
  })
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius = 15,
  ) {
    // We need to inject TrackingService properly.
    // DriverModule imports TrackingModule?
    // Let's assume yes or I will check.
    // If not, I can't use it directly here.
    // Better to use DriverService which wraps it?
    // Let's check imports.
    // For now, I'll assume I can inject TrackingService if I add it to constructor.
    return this.trackingService.findNearbyDrivers(lat, lng, radius);
  }

  @Get('/load-more')
  @ApiAuth({
    type: DriverResDto,
    summary: 'Load more Drivers',
    isPaginated: true,
    paginationType: 'cursor',
  })
  async loadMoreDrivers(
    @Query() reqDto: LoadMoreDriversReqDto,
  ): Promise<CursorPaginatedDto<DriverResDto>> {
    return await this.driverService.loadMoreDrivers(reqDto);
  }

  @Get(':id')
  @ApiPublic()
  @ApiAuth({ type: DriverResDto, summary: 'Find Driver by id' })
  @ApiParam({ name: 'id', type: 'String' })
  async findDriver(
    @Param('id', ParseUUIDPipe) id: Uuid,
  ): Promise<DriverResDto> {
    return await this.driverService.findOne(id);
  }

  @Patch(':id')
  @ApiAuth({ type: DriverResDto, summary: 'Update Driver' })
  @ApiParam({ name: 'id', type: 'String' })
  updateDriver(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: UpdateDriverReqDto,
  ) {
    return this.driverService.update(id, reqDto);
  }

  @Post(':id/recharge')
  @ApiAuth({ summary: 'Recharge a driver balance (pay debt)' })
  @ApiParam({ name: 'id', type: 'String' })
  rechargeWallet(
    @Param('id', ParseUUIDPipe) id: Uuid,
    @Body() reqDto: RechargeWalletReqDto,
    @CurrentUser() user: any,
  ) {
    return this.driverService.rechargeWallet(id, reqDto.amount, user.id);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete Driver',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  removeDriver(@Param('id', ParseUUIDPipe) id: Uuid) {
    return this.driverService.remove(id);
  }
}
