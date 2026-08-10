import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarkupColumns1786394575155 implements MigrationInterface {
    name = 'AddMarkupColumns1786394575155'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_settings"
            ADD "bottledCustomerMarkup" numeric(10, 2) NOT NULL DEFAULT '3'
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings"
            ADD "tankerSpringCustomerMarkup" numeric(10, 2) NOT NULL DEFAULT '5'
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings"
            ADD "tankerWellCustomerMarkup" numeric(10, 2) NOT NULL DEFAULT '50'
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings"
            ALTER COLUMN "tankerSpringCommission"
            SET DEFAULT '0.3'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_settings"
            ALTER COLUMN "tankerSpringCommission"
            SET DEFAULT 0.3
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings" DROP COLUMN "tankerWellCustomerMarkup"
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings" DROP COLUMN "tankerSpringCustomerMarkup"
        `);
        await queryRunner.query(`
            ALTER TABLE "system_settings" DROP COLUMN "bottledCustomerMarkup"
        `);
    }

}
