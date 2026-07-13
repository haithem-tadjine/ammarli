import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { DriverResDto } from './apps/backend/src/api/driver/dto/driver.res.dto';
import { DriverTypeEnum } from './apps/backend/src/api/driver/enums/driver-type.enum';

const driverEntity = {
  id: 'driver-123',
  type: DriverTypeEnum.TANKER,
  truckPlate: '123-456',
  waterType: 'spring',
  capacity: 1000,
  rating: 5,
  inventory: {},
  user: {
    id: 'user-456',
    firstName: 'Test',
    lastName: 'Driver',
    phone: '1234567890',
  }
};

const dto = plainToInstance(DriverResDto, driverEntity, {
  excludeExtraneousValues: true,
});

console.log('DTO:', JSON.stringify(dto, null, 2));
