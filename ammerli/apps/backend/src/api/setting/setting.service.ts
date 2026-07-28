import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepository: Repository<SystemSettingEntity>,
  ) {}

  async getSettings(): Promise<SystemSettingEntity> {
    let settings = await this.settingRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.settingRepository.create();
      await this.settingRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(updateSettingDto: UpdateSettingDto): Promise<SystemSettingEntity> {
    let settings = await this.getSettings();
    Object.assign(settings, updateSettingDto);
    return this.settingRepository.save(settings);
  }
}
