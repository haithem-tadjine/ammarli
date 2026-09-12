import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewOrderField1787405000000 implements MigrationInterface {
  name = 'AddReviewOrderField1787405000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isReviewOrder column with default false to ensure backward compatibility and production safety
    await queryRunner.query(
      `ALTER TABLE "requests" ADD "isReviewOrder" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "isReviewOrder"`);
  }
}
