import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWalletAndDebtToUser1785091684749 implements MigrationInterface {
    name = 'AddWalletAndDebtToUser1785091684749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "managedWilaya" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "managedCommune" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "walletBalance" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "debt" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "debt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "walletBalance"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "managedCommune"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "managedWilaya"`);
    }

}
