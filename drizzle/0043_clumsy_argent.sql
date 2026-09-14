CREATE TABLE `catalog_cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(64) NOT NULL,
	`code` varchar(96) NOT NULL,
	`label` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_cities_country_code_unique` UNIQUE(`countryCode`,`code`)
);
--> statement-breakpoint
CREATE TABLE `catalog_countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`label` varchar(96) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_countries_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `catalog_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('Каналы','Чаты') NOT NULL,
	`code` varchar(64) NOT NULL,
	`label` varchar(96) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_topics_category_code_unique` UNIQUE(`category`,`code`)
);
--> statement-breakpoint
CREATE INDEX `catalog_cities_country_sort_idx` ON `catalog_cities` (`countryCode`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `catalog_topics_category_sort_idx` ON `catalog_topics` (`category`,`sortOrder`);