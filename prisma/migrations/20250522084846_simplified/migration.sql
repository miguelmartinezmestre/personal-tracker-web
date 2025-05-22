/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Objective` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Objective` DROP FOREIGN KEY `Objective_categoryId_fkey`;

-- DropIndex
DROP INDEX `Objective_categoryId_fkey` ON `Objective`;

-- AlterTable
ALTER TABLE `Objective` DROP COLUMN `categoryId`,
    ADD COLUMN `category` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Category`;
