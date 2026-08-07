import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExemptedCommunes1786041704187 implements MigrationInterface {
    name = 'AddExemptedCommunes1786041704187'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wilayas"
            ADD "is_debt_ceiling_enabled" boolean NOT NULL DEFAULT true
        `);
        await queryRunner.query(`
            ALTER TABLE "wilayas"
            ADD "exempted_communes" jsonb DEFAULT '[]'
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
            ALTER TABLE "wilayas" DROP COLUMN "exempted_communes"
        `);
        await queryRunner.query(`
            ALTER TABLE "wilayas" DROP COLUMN "is_debt_ceiling_enabled"
        `);
    }

}
