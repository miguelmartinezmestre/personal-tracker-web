-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `AuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `AuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`objectiveId` int NOT NULL,
	`read` tinyint(1) NOT NULL DEFAULT 0,
	`notificationType` varchar(191) NOT NULL,
	`notificationDate` datetime(3) NOT NULL,
	`message` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Objective` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` varchar(191),
	`category` varchar(191),
	`targetValue` double NOT NULL,
	`currentValue` double NOT NULL,
	`deadline` datetime(3),
	`status` varchar(191) NOT NULL,
	`unit` varchar(191),
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Objective_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ProgressUpdate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`objectiveId` int NOT NULL,
	`updatedValue` double NOT NULL,
	`updateDate` datetime(3) NOT NULL,
	`comment` varchar(191),
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `ProgressUpdate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Session` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`value` varchar(191) NOT NULL,
	`status` varchar(191) NOT NULL,
	`userAgent` varchar(191) NOT NULL DEFAULT '',
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Team` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Team_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TeamMember` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('MANAGER','MEMBER') NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `TeamMember_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`password` varchar(191) NOT NULL,
	`username` varchar(191),
	`resetPasswordKey` varchar(191),
	`role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Objective` ADD CONSTRAINT `Objective_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `ProgressUpdate` ADD CONSTRAINT `ProgressUpdate_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE cascade;
*/