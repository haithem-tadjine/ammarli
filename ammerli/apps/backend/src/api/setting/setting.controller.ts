import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingService } from './setting.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller({
  path: 'settings',
  version: '1',
})
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  async getSettings() {
    return this.settingService.getSettings();
  }

  @Put()
  async updateSettings(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingService.updateSettings(updateSettingDto);
  }
}
