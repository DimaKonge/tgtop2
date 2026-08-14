ALTER TABLE `groups_catalog` ADD `listingType` enum('catalog','sale','rent','both') DEFAULT 'catalog' NOT NULL;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `rentalPriceTon` decimal(20,9);--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `minRentalDays` int;--> statement-breakpoint
ALTER TABLE `groups_catalog` ADD `maxRentalDays` int;