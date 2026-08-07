import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDebtCeilingToWilaya1786037350237 implements MigrationInterface {
    name = 'AddDebtCeilingToWilaya1786037350237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wilayas"
            ADD "is_debt_ceiling_enabled" boolean NOT NULL DEFAULT true
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
            ALTER TABLE "wilayas" DROP COLUMN "is_debt_ceiling_enabled"
        `);
    }

}
