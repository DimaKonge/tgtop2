ALTER TABLE `users` ADD `referralCode` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referredBy` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referralEarnings` varchar(64) DEFAULT '0 TON' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);