import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WilayaEntity } from './entities/wilaya.entity';
import { WilayaController } from './wilaya.controller';
import { WilayaService } from './wilaya.service';

@Module({
  imports: [TypeOrmModule.forFeature([WilayaEntity])],
  controllers: [WilayaController],
  providers: [WilayaService],
  exports: [WilayaService],
})
export class WilayaModule {}
