ALTER TABLE `groups_catalog` ADD `ownerPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `ownerSortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `groups_catalog_owner_layout_idx` ON `groups_catalog` (`ownerOpenId`,`ownerPinned`,`ownerSortOrder`);