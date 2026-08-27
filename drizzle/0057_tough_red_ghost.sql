CREATE TABLE `mini_app_launch_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`source` varchar(32) NOT NULL,
	`startParam` varchar(128),
	`sessionKey` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mini_app_launch_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `mini_app_launch_session_unique` UNIQUE(`sessionKey`)
);
--> statement-breakpoint
CREATE INDEX `mini_app_launch_created_idx` ON `mini_app_launch_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `mini_app_launch_source_created_idx` ON `mini_app_launch_events` (`source`,`createdAt`);