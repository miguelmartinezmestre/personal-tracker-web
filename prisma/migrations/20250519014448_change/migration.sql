/*
  Warnings:

  - You are about to drop the column `goalId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `goalId` on the `ProgressUpdate` table. All the data in the column will be lost.
  - You are about to drop the `Goal` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `objectiveId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectiveId` to the `ProgressUpdate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Goal` DROP FOREIGN KEY `Goal_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_goalId_fkey`;

-- DropForeignKey
ALTER TABLE `ProgressUpdate` DROP FOREIGN KEY `ProgressUpdate_goalId_fkey`;

-- DropIndex
DROP INDEX `Notification_goalId_fkey` ON `Notification`;

-- DropIndex
DROP INDEX `ProgressUpdate_goalId_fkey` ON `ProgressUpdate`;

-- AlterTable
ALTER TABLE `Notification` DROP COLUMN `goalId`,
    ADD COLUMN `objectiveId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `ProgressUpdate` DROP COLUMN `goalId`,
    ADD COLUMN `objectiveId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `Goal`;

-- CreateTable
CREATE TABLE `Objective` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `targetValue` DOUBLE NOT NULL,
    `currentValue` DOUBLE NOT NULL,
    `deadline` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Objective` ADD CONSTRAINT `Objective_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgressUpdate` ADD CONSTRAINT `ProgressUpdate_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
