ALTER TABLE `ton_withdrawals` ADD `reference` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `ton_withdrawals` ADD CONSTRAINT `ton_withdrawals_reference_unique` UNIQUE(`reference`);