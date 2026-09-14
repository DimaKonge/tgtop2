CREATE TABLE `auction_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotNumber` int NOT NULL,
	`category` enum('Все','Каналы','Чаты') NOT NULL DEFAULT 'Все',
	`title` varchar(255) NOT NULL DEFAULT 'Свободное место',
	`subtitle` varchar(255) NOT NULL DEFAULT 'Ждет листинга',
	`currentBid` varchar(64) NOT NULL DEFAULT '0 TON',
	`bidAmount` int NOT NULL DEFAULT 0,
	`leaderUsername` varchar(128) NOT NULL DEFAULT '-',
	`leaderUserId` varchar(64),
	`groupId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auction_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`buyerOpenId` varchar(64) NOT NULL,
	`sellerOpenId` varchar(64) NOT NULL,
	`price` varchar(64) NOT NULL,
	`status` enum('open','paid','transferred','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`username` varchar(128),
	`membersCount` int NOT NULL DEFAULT 0,
	`ownerOpenId` varchar(64) NOT NULL,
	`category` enum('Каналы','Чаты') NOT NULL DEFAULT 'Каналы',
	`status` enum('listed','pending','sold') NOT NULL DEFAULT 'listed',
	`messagesCount` int NOT NULL DEFAULT 0,
	`joinedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_catalog_chatId_unique` UNIQUE(`chatId`)
);
