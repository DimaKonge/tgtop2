ALTER TABLE `auction_slots` ADD CONSTRAINT `auction_slots_board_slot_unique` UNIQUE(`category`,`country`,`slotNumber`);--> statement-breakpoint
CREATE INDEX `credit_transactions_user_created_idx` ON `credit_transactions` (`userOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `deals_buyer_status_created_idx` ON `deals` (`buyerOpenId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `deals_seller_status_created_idx` ON `deals` (`sellerOpenId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `deals_status_expires_idx` ON `deals` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `group_stats_snapshots_group_recorded_idx` ON `group_stats_snapshots` (`groupId`,`recordedAt`);