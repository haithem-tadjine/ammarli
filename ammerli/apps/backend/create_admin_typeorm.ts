import 'dotenv/config';
import { AppDataSource } from './src/database/data-source';
import { UserEntity } from './src/api/user/entities/user.entity';
import { UserRoleEnum } from './src/api/user/enums/user-role.enum';

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected.');

    const userRepo = AppDataSource.getRepository(UserEntity);
    const phone = '0696739465';
    const password = '3491761835';

    const existingUser = await userRepo.findOneBy({ phone });
    if (existingUser) {
      console.log('User already exists, updating password and role...');
      existingUser.password = password; // Hook will hash it
      existingUser.role = UserRoleEnum.SUPER_ADMIN;
      await userRepo.save(existingUser);
      console.log('User updated successfully!');
      return;
    }

    const newUser = new UserEntity();
    newUser.phone = phone;
    newUser.password = password; // Hook will hash it
    newUser.role = UserRoleEnum.SUPER_ADMIN;
    newUser.firstName = 'Admin';
    newUser.lastName = 'User';
    newUser.bio = 'Super Admin created via script';
    newUser.createdBy = '00000000-0000-0000-0000-000000000000';
    newUser.updatedBy = '00000000-0000-0000-0000-000000000000';
    newUser.walletBalance = 0;
    newUser.debt = 0;

    await userRepo.save(newUser);
    console.log('Admin account created successfully!');
    console.log(`Phone: ${phone}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main();
