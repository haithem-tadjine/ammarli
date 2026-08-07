import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { WilayaService } from './wilaya.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@/decorators/http.decorators';

@ApiTags('wilayas')
@Controller({
  path: 'wilayas',
  version: '1',
})
export class WilayaController {
  constructor(private readonly wilayaService: WilayaService) {}

  @Get()
  @ApiAuth({ summary: 'Get all Wilayas' })
  async findAll() {
    return this.wilayaService.findAll();
  }

  @Patch(':code/debt-limit')
  @ApiAuth({ summary: 'Update Wilaya debt limit setting and commune exceptions' })
  async updateDebtLimit(
    @Param('code') code: string,
    @Body('isDebtCeilingEnabled') isDebtCeilingEnabled?: boolean,
    @Body('exemptedCommunes') exemptedCommunes?: string[],
  ) {
    return this.wilayaService.updateDebtLimit(code, isDebtCeilingEnabled, exemptedCommunes);
  }
}
