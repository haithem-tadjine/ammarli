import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PromoService } from './promo.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('promos')
@Controller('promos')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  getPromos() {
    return this.promoService.getPromos();
  }

  @Post('apply')
  applyPromo(@Body('code') code: string) {
    return this.promoService.applyPromo(code);
  }

  @Post('use')
  usePromo(@Body('promoId') promoId: string) {
    return this.promoService.usePromo(promoId);
  }
}
