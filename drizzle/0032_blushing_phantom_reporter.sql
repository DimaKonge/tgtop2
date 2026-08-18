ALTER TABLE `groups_catalog` ADD `showOwnerContact` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `publicProfile` boolean DEFAULT false NOT NULL;