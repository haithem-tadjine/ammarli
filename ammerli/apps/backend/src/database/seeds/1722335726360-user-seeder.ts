import { UserEntity } from '@/api/user/entities/user.entity';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class UserSeeder1722335726360 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const repository = dataSource.getRepository(UserEntity);

    const mockUsers = [
      { phone: '+213555000000', role: 'SUPER_ADMIN', name: 'Super Admin' },
      { phone: '+213555111111', role: 'WILAYA_MANAGER', name: 'Wilaya Manager' },
      { phone: '+213555222222', role: 'COMMUNE_MANAGER', name: 'Commune Manager' },
      { phone: '+213555333333', role: 'AGENT', name: 'Agent (Cashier)' },
    ];

    for (const u of mockUsers) {
      const existing = await repository.findOneBy({ phone: u.phone });
      if (!existing) {
        await repository.insert(
          new UserEntity({
            firstName: u.name,
            lastName: 'Test',
            phone: u.phone,
            password: 'password123',
            role: u.role as any,
            bio: `I am a ${u.role}`,
            createdBy: SYSTEM_USER_ID,
            updatedBy: SYSTEM_USER_ID,
          }),
        );
      }
    }

    const userFactory = factoryManager.get(UserEntity);
    await userFactory.saveMany(5);
  }
}
