import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WilayaEntity } from './entities/wilaya.entity';

@Injectable()
export class WilayaService {
  constructor(
    @InjectRepository(WilayaEntity)
    private readonly wilayaRepo: Repository<WilayaEntity>,
  ) {}

  async findAll() {
    return this.wilayaRepo.find({ order: { code: 'ASC' } });
  }

  async updateDebtLimit(code: string, isEnabled?: boolean, exemptedCommunes?: string[]) {
    const wilaya = await this.wilayaRepo.findOne({ where: { code } });
    
    if (!wilaya) {
      if (isEnabled !== undefined || exemptedCommunes !== undefined) {
        // If wilaya doesn't exist, create it (we are lazy-seeding from frontend)
        const newWilaya = this.wilayaRepo.create({
          code,
          name: `ولاية ${code}`,
          isDebtCeilingEnabled: isEnabled ?? true,
          exemptedCommunes: exemptedCommunes || [],
          isActive: true
        });
        return this.wilayaRepo.save(newWilaya);
      }
      throw new NotFoundException(`Wilaya with code ${code} not found`);
    }

    if (isEnabled !== undefined) wilaya.isDebtCeilingEnabled = isEnabled;
    if (exemptedCommunes !== undefined) wilaya.exemptedCommunes = exemptedCommunes;

    return this.wilayaRepo.save(wilaya);
  }
}
