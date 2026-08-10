import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTankerPricingToDriver1786500000000 implements MigrationInterface {
    name = 'AddTankerPricingToDriver1786500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" ADD "price_per_unit" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "floor_price" numeric(10,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "floor_price"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "price_per_unit"`);
    }
}
