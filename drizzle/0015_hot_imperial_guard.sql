ALTER TABLE `groups_catalog` ADD `subcategory` varchar(64) DEFAULT 'General' NOT NULL;--> statement-breakpoint
CREATE INDEX `groups_catalog_listing_filters_idx` ON `groups_catalog` (`status`,`category`,`subcategory`,`country`);--> statement-breakpoint
CREATE INDEX `groups_catalog_owner_idx` ON `groups_catalog` (`ownerOpenId`);--> statement-breakpoint
CREATE INDEX `groups_catalog_listed_at_idx` ON `groups_catalog` (`listedAt`);