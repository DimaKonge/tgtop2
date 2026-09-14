ALTER TABLE `groups_catalog` MODIFY COLUMN `listingType` enum('catalog','sale') NOT NULL DEFAULT 'catalog';--> statement-breakpoint
UPDATE `groups_catalog`
SET `listingType` = CASE
  WHEN `listingType` = 'both' AND `salePriceTon` IS NOT NULL THEN 'sale'
  ELSE 'catalog'
END
WHERE `listingType` IN ('rent', 'both');--> statement-breakpoint
ALTER TABLE `groups_catalog` MODIFY COLUMN `listingType` enum('catalog','sale') NOT NULL DEFAULT 'catalog';--> statement-breakpoint
ALTER TABLE `groups_catalog` DROP COLUMN `rentalPriceTon`;--> statement-breakpoint
ALTER TABLE `groups_catalog` DROP COLUMN `minRentalDays`;--> statement-breakpoint
ALTER TABLE `groups_catalog` DROP COLUMN `maxRentalDays`;
