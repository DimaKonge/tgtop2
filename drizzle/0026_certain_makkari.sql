ALTER TABLE `groups_catalog` ADD `city` varchar(96);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `anonymousListing` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `groups_catalog_geography_idx` ON `groups_catalog` (`status`,`country`,`city`);